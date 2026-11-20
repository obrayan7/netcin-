import Link from "next/link";
import { ListButton, LikeButton } from "./ActionButtons";
import { badgeFor, fmtDuration, splitList, type CardTitle } from "@/lib/catalog";
import { getViewerCtx } from "@/lib/viewer";

/**
 * Carte d'affiche. Au survol : lecture, ma liste, j'aime, plus d'infos,
 * classification, durée / saisons et genres. Sur mobile, un appui ouvre la fiche.
 */
export default async function TitleCard({ t, progress }: { t: CardTitle; progress?: number }) {
  const ctx = await getViewerCtx();
  const badge = badgeFor(t);
  const img = t.posterUrl || t.backdropUrl;
  const length = t.type !== "MOVIE" ? `${t._count.seasons} saison${t._count.seasons > 1 ? "s" : ""}` : fmtDuration(t.durationMin);
  const genres = splitList(t.genres).slice(0, 3).join(" • ");

  return (
    <div className="tc" title={t.name}>
      <Link href={`/title/${t.id}`} className="tc-hit" aria-label={`${t.name} : plus d'infos`} />
      {badge && <span className="badge">{badge}</span>}
      {img ? <img src={img} alt="" loading="lazy" /> : <div className="no-img">{t.name}</div>}

      <div className="tc-over">
        <div className="tc-btns">
          <Link className="rb play" href={`/watch/${t.id}`} aria-label={`Lire ${t.name}`} title="Lecture">▶</Link>
          <ListButton titleId={t.id} active={ctx.list.has(t.id)} loggedIn={ctx.loggedIn} />
          <LikeButton titleId={t.id} active={ctx.likes.has(t.id)} loggedIn={ctx.loggedIn} />
          <Link className="rb" href={`/title/${t.id}`} aria-label="Plus d'infos" title="Plus d'infos">⌄</Link>
        </div>
        <p className="tc-meta">
          {t.ageRating && <span className="age">{t.ageRating}</span>}
          {length && <span>{length}</span>}
          <span>HD</span>
        </p>
        {genres && <p className="tc-genres">{genres}</p>}
      </div>

      {progress !== undefined && (
        <div className="tc-progress" aria-hidden>
          <i style={{ width: `${Math.max(2, Math.min(100, progress))}%` }} />
        </div>
      )}
    </div>
  );
}
