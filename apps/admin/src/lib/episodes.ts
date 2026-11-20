// Outils (purs, sans dépendance) pour importer un dossier de saison : tri des fichiers,
// détection du numéro d'épisode dans le nom, type MIME.

const VIDEO_EXT = ["mp4", "m4v", "webm", "mov", "mkv", "avi", "m3u8"];
/** Formats que les navigateurs lisent sans conversion. */
const WEB_OK = ["mp4", "m4v", "webm", "mov", "m3u8"];

export const extOf = (name: string) => (name.split(".").pop() ?? "").toLowerCase();
export const baseName = (path: string) => path.split(/[\\/]/).pop() ?? path;

export function isVideoFile(name: string, type = ""): boolean {
  return type.startsWith("video/") || VIDEO_EXT.includes(extOf(name));
}

export const isWebPlayable = (name: string) => WEB_OK.includes(extOf(name));

/** Le navigateur laisse parfois `file.type` vide (ex : .mkv) : on le déduit de l'extension. */
export function mimeFor(name: string, type = ""): string {
  if (type.startsWith("video/")) return type;
  const m: Record<string, string> = {
    mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm", mov: "video/quicktime",
    mkv: "video/x-matroska", avi: "video/x-msvideo", m3u8: "application/vnd.apple.mpegurl",
  };
  return m[extOf(name)] ?? "video/mp4";
}

/** Tri « naturel » : Episode 2 avant Episode 10. */
export const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" });

// Bruit à ignorer avant de chercher un numéro : résolutions, années, codecs…
const NOISE = /\b(2160|1440|1080|720|576|480|360)\s*[pi]?\b|\b(19|20)\d{2}\b|\b[xh]\.?26[45]\b|\bhevc\b|\b\d{1,2}\s*bit\b|\b[257]\.[01]\b|\bweb[-. ]?dl\b|\bblu[-. ]?ray\b/gi;

/** Numéro d'épisode d'un nom de fichier (ex : « Bel.Air.S01E03.1080p.mkv » → 3), ou null. */
export function episodeNumberFromName(fileName: string): number | null {
  const stem = baseName(fileName).replace(/\.[a-z0-9]{2,4}$/i, "").replace(NOISE, " ");
  const patterns: RegExp[] = [
    /s\d{1,2}[\s._-]*e(?:p)?[\s._-]*(\d{1,3})(?!\d)/i, // S01E03
    /(?<![a-z])(?:e|ep|eps|episode|épisode)[\s._-]*(\d{1,3})(?!\d)/i, // E03, Episode 3
    /(?<!\d)\d{1,2}x(\d{1,3})(?!\d)/i, // 1x03
    /^\s*(\d{1,3})(?!\d)/, // « 03 - Titre »
  ];
  for (const re of patterns) {
    const m = stem.match(re);
    if (m) return parseInt(m[1], 10);
  }
  const all = [...stem.matchAll(/(?<!\d)(\d{1,3})(?!\d)/g)];
  return all.length ? parseInt(all[all.length - 1][1], 10) : null;
}

/**
 * Numéros d'épisodes pour une liste de fichiers (déjà triés). On utilise les numéros trouvés
 * dans les noms seulement s'ils sont tous présents et uniques ; sinon on numérote 1, 2, 3…
 * dans l'ordre alphabétique « naturel ».
 */
export function assignNumbers(fileNames: string[]): number[] {
  const guessed = fileNames.map(episodeNumberFromName);
  const ok = guessed.every((n) => n !== null && n > 0) && new Set(guessed).size === guessed.length;
  return ok ? (guessed as number[]) : fileNames.map((_, i) => i + 1);
}
