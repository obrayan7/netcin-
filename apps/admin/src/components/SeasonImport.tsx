"use client";

import { useEffect, useRef, useState } from "react";
import { assignNumbers, baseName, isVideoFile, isWebPlayable, mimeFor, naturalCompare } from "@/lib/episodes";

type Row = {
  key: string;
  file: File;
  number: number;
  name: string;
  durationMin: number | null;
  status: "idle" | "uploading" | "done" | "error";
  progress: number;
  url: string;
  error?: string;
};

type Props = {
  number: string;
  onNumber: (v: string) => void;
  /** Numéros de saison qui existent déjà pour cette série (avertissement de remplacement). */
  existing?: number[];
  /** Avertit le formulaire parent de l'état de l'envoi. */
  onBusy?: (busy: boolean) => void;
};

/** Durée d'une vidéo lue depuis ses métadonnées (null si le navigateur ne sait pas la lire, ex : .mkv). */
function probeDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (n: number | null) => {
      URL.revokeObjectURL(url);
      v.removeAttribute("src");
      resolve(n);
    };
    const t = setTimeout(() => done(null), 4000);
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      clearTimeout(t);
      done(Number.isFinite(v.duration) && v.duration > 0 ? Math.max(1, Math.round(v.duration / 60)) : null);
    };
    v.onerror = () => {
      clearTimeout(t);
      done(null);
    };
    v.src = url;
  });
}

async function putFile(row: Row, onProgress: (p: number) => void): Promise<string> {
  const contentType = mimeFor(row.file.name, row.file.type);
  const r = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: "videos", filename: row.file.name, contentType }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Autorisation refusée");
  const { uploadUrl, publicUrl } = await r.json();
  await new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", uploadUrl);
    x.setRequestHeader("Content-Type", contentType);
    x.upload.onprogress = (ev) => ev.lengthComputable && onProgress(Math.round((ev.loaded / ev.total) * 100));
    x.onload = () => (x.status < 300 ? resolve() : reject(new Error(`Échec de l'envoi (${x.status})`)));
    x.onerror = () => reject(new Error("Erreur réseau (CORS du bucket ?)"));
    x.send(row.file);
  });
  return publicUrl as string;
}

const CONCURRENCY = 2;

/**
 * Import d'une saison : on choisit le dossier (ou des fichiers), on vérifie les numéros et les titres,
 * puis on envoie toutes les vidéos au bucket. Le résultat part dans le champ caché `episodesJson`.
 */
export default function SeasonImport({ number, onNumber, existing = [], onBusy }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [uploading, setUploading] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const rowsRef = useRef<Row[]>([]);
  rowsRef.current = rows;
  const rootRef = useRef<HTMLDivElement>(null);

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const allDone = rows.length > 0 && rows.every((r) => r.status === "done");
  const pending = rows.length > 0 && !allDone;

  useEffect(() => onBusy?.(pending), [pending, onBusy]);

  // Empêche d'envoyer le formulaire tant que les vidéos ne sont pas toutes envoyées.
  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const guard = (e: Event) => {
      if (rowsRef.current.length > 0 && !rowsRef.current.every((r) => r.status === "done")) {
        e.preventDefault();
        alert("Envoyez d'abord toutes les vidéos de la saison (bouton « Envoyer les vidéos »), ou retirez-les de la liste.");
      }
    };
    form.addEventListener("submit", guard);
    return () => form.removeEventListener("submit", guard);
  }, []);

  async function pick(files: FileList | null) {
    if (!files) return;
    const all = Array.from(files);
    const videos = all
      .filter((f) => isVideoFile(f.name, f.type))
      .sort((a, b) => naturalCompare(a.webkitRelativePath || a.name, b.webkitRelativePath || b.name));
    setSkipped(all.length - videos.length);
    const nums = assignNumbers(videos.map((f) => baseName(f.name)));
    const next: Row[] = videos.map((file, i) => ({
      key: `${file.name}-${file.size}-${i}`,
      file,
      number: nums[i],
      name: `Épisode ${nums[i]}`,
      durationMin: null,
      status: "idle",
      progress: 0,
      url: "",
    }));
    next.sort((a, b) => a.number - b.number);
    setRows(next);
    // Durées lues en arrière-plan (pour afficher « 56 min » sur le site)
    for (const r of next) probeDuration(r.file).then((d) => patch(r.key, { durationMin: d }));
  }

  async function upload() {
    setUploading(true);
    const queue = rowsRef.current.filter((r) => r.status !== "done");
    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const row = queue[next++];
        patch(row.key, { status: "uploading", progress: 0, error: undefined });
        try {
          const url = await putFile(row, (p) => patch(row.key, { progress: p }));
          patch(row.key, { status: "done", progress: 100, url });
        } catch (e) {
          patch(row.key, { status: "error", error: (e as Error).message });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    setUploading(false);
  }

  const dupes = new Set(rows.map((r) => r.number).filter((n, i, a) => a.indexOf(n) !== i));
  const sNum = parseInt(number, 10);
  const replacing = Number.isFinite(sNum) && existing.includes(sNum);
  const total = rows.length;
  const done = rows.filter((r) => r.status === "done").length;
  const payload = JSON.stringify(
    rows.filter((r) => r.status === "done").map((r) => ({ number: r.number, name: r.name, videoUrl: r.url, durationMin: r.durationMin })),
  );

  return (
    <div ref={rootRef} className="season-import">
      <div className="grid2">
        <div className="field">
          <label>Numéro de la saison *</label>
          <input name="seasonNumber" type="number" min={1} required value={number} onChange={(e) => onNumber(e.target.value)} />
        </div>
        <div className="field">
          <label>Dossier de la saison</label>
          <div className="pick">
            <label className="btn ghost">
              Choisir le dossier
              <input
                type="file"
                {...({ webkitdirectory: "" } as Record<string, string>)} // attribut non standard, géré par tous les navigateurs récents
                multiple
                hidden
                onChange={(e) => pick(e.target.files)}
              />
            </label>
            <label className="btn ghost">
              ou des fichiers
              <input type="file" multiple accept="video/*,.mkv,.m3u8" hidden onChange={(e) => pick(e.target.files)} />
            </label>
          </div>
        </div>
      </div>

      {replacing && (
        <p className="warn">
          La saison {sNum} existe déjà : les épisodes ayant le même numéro seront remplacés, les autres seront ajoutés.
        </p>
      )}
      {skipped > 0 && <p className="meta">{skipped} fichier(s) ignoré(s) (sous-titres, images…) : seules les vidéos sont gardées.</p>}

      {total > 0 && (
        <>
          <table className="table">
            <thead>
              <tr><th style={{ width: 70 }}>N°</th><th>Titre de l'épisode</th><th>Fichier</th><th style={{ width: 150 }}>État</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={r.number}
                      disabled={r.status === "uploading"}
                      onChange={(e) => patch(r.key, { number: parseInt(e.target.value, 10) || 1 })}
                      className={dupes.has(r.number) ? "bad" : ""}
                    />
                  </td>
                  <td>
                    <input value={r.name} disabled={r.status === "uploading"} onChange={(e) => patch(r.key, { name: e.target.value })} />
                  </td>
                  <td className="meta">
                    {baseName(r.file.name)}
                    {r.durationMin ? ` · ${r.durationMin} min` : ""}
                    {!isWebPlayable(r.file.name) && <span className="warn"> · format peu compatible navigateur (MP4 conseillé)</span>}
                  </td>
                  <td>
                    {r.status === "idle" && <span className="meta">En attente</span>}
                    {r.status === "uploading" && (
                      <div className="progress"><div style={{ width: `${r.progress}%` }} /></div>
                    )}
                    {r.status === "done" && <span className="ok">✔ Envoyé</span>}
                    {r.status === "error" && <span className="error" title={r.error}>Échec : {r.error}</span>}
                  </td>
                  <td>
                    <button type="button" className="btn danger" disabled={r.status === "uploading"} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {dupes.size > 0 && <p className="error">Deux épisodes ont le même numéro : corrigez-les avant d'envoyer.</p>}

          <div className="inline-form">
            <button type="button" className="btn" disabled={uploading || allDone || dupes.size > 0} onClick={upload}>
              {uploading ? `Envoi en cours… ${done}/${total}` : allDone ? "Toutes les vidéos sont envoyées" : `Envoyer les vidéos (${total - done})`}
            </button>
            {allDone && <span className="ok">{total} épisode(s) prêt(s) : validez le formulaire pour les enregistrer.</span>}
            {rows.some((r) => r.status === "error") && !uploading && <span className="meta">Cliquez de nouveau pour réessayer les échecs.</span>}
          </div>
        </>
      )}

      <input type="hidden" name="episodesJson" value={allDone ? payload : "[]"} />
    </div>
  );
}

/** Version intégrée au formulaire « Nouveau titre » : visible seulement pour une série ou un animé. */
export function InlineSeasonImport() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [number, setNumber] = useState("1");

  useEffect(() => {
    const sel = ref.current?.closest("form")?.querySelector<HTMLSelectElement>('select[name="type"]');
    if (!sel) return;
    const sync = () => setShow(sel.value !== "MOVIE");
    sync();
    sel.addEventListener("change", sync);
    return () => sel.removeEventListener("change", sync);
  }, []);

  return (
    <div ref={ref}>
      {show && (
        <fieldset className="card">
          <legend>Importer une saison (optionnel)</legend>
          <p className="meta">
            Choisissez le dossier qui contient tous les épisodes de la saison et indiquez son numéro. Vous pourrez ajouter les
            autres saisons plus tard avec « Ajouter une saison à une série existante ».
          </p>
          <SeasonImport number={number} onNumber={setNumber} />
        </fieldset>
      )}
    </div>
  );
}
