import type { Title } from "@netcine/db";

/** À mettre dans `include` pour obtenir le nombre de saisons (affiché sur les cartes). */
export const withCount = { _count: { select: { seasons: true } } } as const;

export type CardTitle = Title & { _count: { seasons: number } };

const FRESH_MS = 14 * 24 * 3600 * 1000;

/** Badge affiché sur l'affiche : « Nouveau » ou « Nouvel épisode ». */
export function badgeFor(t: Pick<Title, "createdAt" | "lastEpisodeAt">): string | null {
  const now = Date.now();
  if (t.lastEpisodeAt && now - new Date(t.lastEpisodeAt).getTime() < FRESH_MS) {
    // un titre tout juste créé reste « Nouveau »
    return now - new Date(t.createdAt).getTime() < FRESH_MS ? "Nouveau" : "Nouvel épisode";
  }
  return now - new Date(t.createdAt).getTime() < FRESH_MS ? "Nouveau" : null;
}

export function fmtDuration(min: number | null | undefined): string {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

export const splitList = (s: string) =>
  s.split(",").map((x) => x.trim()).filter(Boolean);
