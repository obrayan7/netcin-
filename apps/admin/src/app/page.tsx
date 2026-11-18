import Link from "next/link";
import { db } from "@netcine/db";
import { requireAdmin } from "@/lib/auth";
import { deleteTitle } from "./actions";

export default async function AdminHome() {
  await requireAdmin();
  const titles = await db.title.findMany({
    orderBy: { createdAt: "desc" },
    include: { seasons: { include: { _count: { select: { episodes: true } } } } },
  });

  return (
    <>
      <div className="row-between">
        <h1>Films & séries ({titles.length})</h1>
        <Link className="btn" href="/titles/new">+ Ajouter un titre</Link>
      </div>
      <table className="table">
        <thead>
          <tr><th></th><th>Titre</th><th>Type</th><th>Contenu</th><th>Statut</th><th></th></tr>
        </thead>
        <tbody>
          {titles.map((t) => (
            <tr key={t.id}>
              <td>{t.posterUrl && <img src={t.posterUrl} alt="" className="thumb" />}</td>
              <td><Link href={`/titles/${t.id}`}>{t.name}</Link></td>
              <td>{t.type === "MOVIE" ? "Film" : "Série"}</td>
              <td>
                {t.type === "SERIES"
                  ? `${t.seasons.length} saison(s), ${t.seasons.reduce((a, s) => a + s._count.episodes, 0)} épisode(s)`
                  : t.videoUrl ? "Vidéo OK" : "Vidéo manquante"}
              </td>
              <td>{t.published ? "Publié" : "Brouillon"}{t.featured && " · À la une"}</td>
              <td className="actions">
                <Link className="btn ghost" href={`/titles/${t.id}`}>Modifier</Link>
                <form action={deleteTitle.bind(null, t.id)}>
                  <button className="btn danger">Supprimer</button>
                </form>
              </td>
            </tr>
          ))}
          {titles.length === 0 && <tr><td colSpan={6}>Aucun titre pour l'instant.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
