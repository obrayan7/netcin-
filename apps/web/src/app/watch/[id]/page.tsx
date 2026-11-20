import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@netcine/db";
import Player from "@/components/Player";
import Paywall from "@/components/Paywall";
import { getGate } from "@/lib/access";
import { getViewerId } from "@/lib/session";

export const dynamic = "force-dynamic";

const finished = (p: { position: number; duration: number }) => p.duration > 0 && p.position / p.duration > 0.95;

function Unavailable({ id, text }: { id: string; text: string }) {
  return (
    <div className="watch">
      <div className="watch-bar">
        <Link href={`/title/${id}`}>← Retour</Link>
      </div>
      <p className="empty">{text}</p>
    </div>
  );
}

export default async function Watch({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ep?: string }>;
}) {
  const { id } = await params;
  const { ep } = await searchParams;
  const viewerId = await getViewerId();

  const title = await db.title.findUnique({
    where: { id },
    include: { seasons: { orderBy: { number: "asc" }, include: { episodes: { orderBy: { number: "asc" } } } } },
  });
  if (!title || !title.published) notFound();

  const isSeries = title.type !== "MOVIE";
  const flatAll = isSeries ? title.seasons.flatMap((s) => s.episodes) : [];
  const gate = await getGate(viewerId, flatAll);
  let locked = !isSeries && gate.movieLocked;

  let src = title.videoUrl;
  let heading = title.name;
  let poster = title.backdropUrl;
  let episodeId = "";
  let next: { id: string; name: string } | undefined;

  if (isSeries) {
    const flat = title.seasons.flatMap((s) => s.episodes.map((e) => ({ ...e, season: s.number })));
    let idx = flat.findIndex((e) => e.id === ep);
    if (idx < 0 && viewerId) {
      // sans épisode demandé : reprendre le dernier regardé (ou le suivant s'il est terminé)
      const last = await db.watchProgress.findFirst({ where: { viewerId, titleId: id }, orderBy: { updatedAt: "desc" } });
      if (last) {
        idx = flat.findIndex((e) => e.id === last.episodeId);
        if (idx >= 0 && finished(last) && flat[idx + 1]) idx += 1;
      }
    }
    if (idx < 0) idx = 0;
    const current = flat[idx];
    if (!current) return <Unavailable id={id} text="Aucun épisode n'est encore disponible pour cette série." />;
    locked = gate.lockedIds.has(current.id);
    src = current.videoUrl;
    episodeId = current.id;
    heading = `${title.name} — S${current.season} · É${current.number} · ${current.name}`;
    poster = current.thumbUrl || poster;
    next = flat[idx + 1];
  }
  if (locked) {
    return (
      <div className="watch">
        <div className="watch-bar">
          <Link href={`/title/${id}`}>← Retour</Link>
          <span>{heading}</span>
        </div>
        <Paywall
          titleId={title.id}
          titleName={title.name}
          loggedIn={!!viewerId}
          price={gate.settings.priceAmount}
          currency={gate.settings.currency}
          periodDays={gate.settings.periodDays}
          freeCount={gate.freeCount}
          isSeries={isSeries}
          next={episodeId ? `/watch/${id}?ep=${episodeId}` : `/watch/${id}`}
        />
      </div>
    );
  }
  if (!src) return <Unavailable id={id} text="Cette vidéo sera bientôt disponible." />;

  let startAt = 0;
  if (viewerId) {
    const p = await db.watchProgress.findUnique({
      where: { viewerId_titleId_episodeId: { viewerId, titleId: id, episodeId } },
    });
    if (p && !finished(p)) startAt = p.position;
  }

  return (
    <div className="watch">
      <div className="watch-bar">
        <Link href={`/title/${title.id}`}>← Retour</Link>
        <span>{heading}</span>
      </div>
      <Player
        key={`${src}-${episodeId}`}
        src={src}
        poster={poster || undefined}
        titleId={title.id}
        episodeId={episodeId}
        startAt={startAt}
        loggedIn={!!viewerId}
        closeHref={`/title/${title.id}`}
        nextHref={next ? `/watch/${title.id}?ep=${next.id}` : undefined}
      />
    </div>
  );
}
