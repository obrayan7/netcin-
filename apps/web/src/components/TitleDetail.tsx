import Link from "next/link";
import { notFound } from "next/navigation";
import { db, formatPrice } from "@netcine/db";
import { ListButton, LikeButton } from "./ActionButtons";
import SeasonEpisodes from "./SeasonEpisodes";
import TitleCard from "./TitleCard";
import { fmtDuration, splitList, withCount } from "@/lib/catalog";
import { getViewerCtx } from "@/lib/viewer";
import { getViewerId } from "@/lib/session";
import { getGate } from "@/lib/access";

/** Contenu de la fiche : utilisé par la page /title/[id] et par la fenêtre en superposition. */
export default async function TitleDetail({ id }: { id: string }) {
  const title = await db.title.findUnique({
    where: { id },
    include: {
      categories: true,
      seasons: { orderBy: { number: "asc" }, include: { episodes: { orderBy: { number: "asc" } } } },
    },
  });
  if (!title || !title.published) notFound();

  const ctx = await getViewerCtx();
  const similar = title.categories.length
    ? await db.title.findMany({
        where: { published: true, id: { not: title.id }, categories: { some: { id: { in: title.categories.map((c) => c.id) } } } },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: withCount,
      })
    : [];

  const isSeries = title.type === "SERIES";
  const length = isSeries ? `${title.seasons.length} saison${title.seasons.length > 1 ? "s" : ""}` : fmtDuration(title.durationMin);
  const cast = splitList(title.cast);
  const genres = splitList(title.genres);
  const mood = splitList(title.mood);
  const langs = splitList(title.languages);
  const gate = await getGate(await getViewerId(), isSeries ? title.seasons.flatMap((s) => s.episodes) : []);
  const showNotice = gate.settings.paidMode && !gate.subscribed && ((isSeries && gate.lockedIds.size > 0) || gate.movieLocked);
  const bg = title.backdropUrl || title.posterUrl;

  return (
    <article>
      <header className="td-hero" style={{ backgroundImage: `linear-gradient(to top, #15151a 4%, transparent 75%), url("${bg}")` }}>
        <div>
          <h1>{title.name}</h1>
          <div className="td-actions">
            <Link className="btn" href={`/watch/${title.id}`}>▶ Lecture</Link>
            <ListButton variant="pill" titleId={title.id} active={ctx.list.has(title.id)} loggedIn={ctx.loggedIn} />
            <LikeButton variant="pill" titleId={title.id} active={ctx.likes.has(title.id)} loggedIn={ctx.loggedIn} />
          </div>
        </div>
      </header>

      {showNotice && (
        <p className="td-notice">
          {isSeries
            ? `Les ${gate.freeCount} premiers épisodes sont gratuits. Pour la suite : abonnement à ${formatPrice(gate.settings.priceAmount, gate.settings.currency)} / ${gate.settings.periodDays === 30 ? "mois" : `${gate.settings.periodDays} jours`}.`
            : `Ce film est réservé aux abonnés (${formatPrice(gate.settings.priceAmount, gate.settings.currency)} / ${gate.settings.periodDays === 30 ? "mois" : `${gate.settings.periodDays} jours`}).`}{" "}
          <Link href={`/subscribe?next=${encodeURIComponent(`/title/${title.id}`)}`}>S'abonner</Link>
        </p>
      )}

      <div className="td-body">
        <div>
          <p className="td-meta">
            {title.year && <span>{title.year}</span>}
            {title.ageRating && <span className="age">{title.ageRating}</span>}
            {length && <span>{length}</span>}
            <span className="hd">HD</span>
          </p>
          <p className="td-syn">{title.synopsis}</p>
        </div>
        <dl className="td-side">
          {cast.length > 0 && (<><dt>Distribution</dt><dd>{cast.join(", ")}</dd></>)}
          {genres.length > 0 && (<><dt>Genres</dt><dd>{genres.join(", ")}</dd></>)}
          {mood.length > 0 && (<><dt>Ce titre est</dt><dd>{mood.join(", ")}</dd></>)}
        </dl>
      </div>

      {langs.length > 0 && (
        <div className="langs" aria-label="Langues audio disponibles">
          <span className="meta">Audio</span>
          {langs.map((l) => (
            <span key={l} className="lang">{l}</span>
          ))}
        </div>
      )}

      {isSeries && (
        <section className="td-section">
          <SeasonEpisodes
            titleId={title.id}
            lockedIds={[...gate.lockedIds]}
            seasons={title.seasons.map((s) => ({
              number: s.number,
              episodes: s.episodes.map((e) => ({
                id: e.id,
                number: e.number,
                name: e.name,
                synopsis: e.synopsis,
                durationMin: e.durationMin,
                thumbUrl: e.thumbUrl,
              })),
            }))}
          />
        </section>
      )}

      {similar.length > 0 && (
        <section className="td-section">
          <h2>Dans le même genre</h2>
          <div className="grid-titles">
            {similar.map((s) => (
              <TitleCard key={s.id} t={s} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
