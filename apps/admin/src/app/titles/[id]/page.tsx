import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@netcine/db";
import { requireAdmin } from "@/lib/auth";
import TitleForm from "../TitleForm";
import EpisodeForm from "../EpisodeForm";
import { addSeason, deleteEpisode, deleteSeason } from "../../actions";

export default async function EditTitle({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { saved } = await searchParams;

  const [title, categories] = await Promise.all([
    db.title.findUnique({
      where: { id },
      include: {
        categories: true,
        seasons: { orderBy: { number: "asc" }, include: { episodes: { orderBy: { number: "asc" } } } },
      },
    }),
    db.category.findMany({ orderBy: { order: "asc" } }),
  ]);
  if (!title) notFound();

  return (
    <>
      <div className="row-between">
        <h1>{title.name}</h1>
        {title.published && (
          <a className="btn ghost" href={`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/title/${title.id}`} target="_blank" rel="noreferrer">
            Voir sur le site ↗
          </a>
        )}
      </div>
      {saved && <p className="ok">Enregistré ✔</p>}
      <TitleForm title={title} categories={categories} />

      {title.type !== "MOVIE" && (
        <section>
          <h2>Saisons & épisodes</h2>

          <p>
            <Link className="btn" href={`/seasons/new?titleId=${title.id}`}>+ Ajouter une saison depuis un dossier</Link>
          </p>
          <p className="meta">Ou créez une saison vide et ajoutez les épisodes un par un :</p>
          <form action={addSeason.bind(null, title.id)} className="inline-form">
            <input name="number" type="number" min={1} placeholder="N° de saison" required />
            <button className="btn">+ Ajouter une saison</button>
          </form>

          {title.seasons.map((s) => (
            <details key={s.id} className="card" open={title.seasons.length === 1}>
              <summary>
                Saison {s.number} — {s.episodes.length} épisode(s)
              </summary>

              {s.episodes.map((ep) => (
                <div key={ep.id} className="episode">
                  <EpisodeForm titleId={title.id} seasonId={s.id} episode={ep} />
                  <form action={deleteEpisode.bind(null, title.id, ep.id)}>
                    <button className="btn danger">Supprimer l'épisode</button>
                  </form>
                </div>
              ))}

              <h3>Nouvel épisode</h3>
              <EpisodeForm titleId={title.id} seasonId={s.id} nextNumber={(s.episodes.at(-1)?.number ?? 0) + 1} />

              <form action={deleteSeason.bind(null, title.id, s.id)}>
                <button className="btn danger">Supprimer la saison {s.number}</button>
              </form>
            </details>
          ))}
        </section>
      )}
    </>
  );
}
