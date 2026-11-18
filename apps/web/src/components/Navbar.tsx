import { db } from "@netcine/db";
import { getViewerId } from "@/lib/session";
import NavbarClient, { type NewsItem } from "./NavbarClient";

export default async function Navbar() {
  const id = await getViewerId();
  const [viewer, created, withEpisode] = await Promise.all([
    id ? db.viewer.findUnique({ where: { id }, select: { name: true, email: true } }) : Promise.resolve(null),
    db.title.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, posterUrl: true, createdAt: true },
    }),
    db.title.findMany({
      where: { published: true, lastEpisodeAt: { not: null } },
      orderBy: { lastEpisodeAt: "desc" },
      take: 6,
      select: { id: true, name: true, posterUrl: true, lastEpisodeAt: true },
    }),
  ]);

  // Nouveautés : titres récents + nouveaux épisodes, dédoublonnés, du plus récent au plus ancien
  const map = new Map<string, NewsItem>();
  for (const t of created) map.set(t.id, { id: t.id, name: t.name, posterUrl: t.posterUrl, label: "Nouveau", at: t.createdAt.getTime() });
  for (const t of withEpisode) {
    const at = t.lastEpisodeAt!.getTime();
    const cur = map.get(t.id);
    if (!cur || at > cur.at) map.set(t.id, { id: t.id, name: t.name, posterUrl: t.posterUrl, label: "Nouvel épisode", at });
  }
  const news = [...map.values()].sort((a, b) => b.at - a.at).slice(0, 8);

  const display = viewer ? viewer.name || viewer.email : "";
  return <NavbarClient viewer={viewer ? { initial: display.charAt(0).toUpperCase(), name: display } : null} news={news} />;
}
