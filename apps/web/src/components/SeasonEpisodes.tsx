"use client";

import Link from "next/link";
import { useState } from "react";

type Ep = { id: string; number: number; name: string; synopsis: string; durationMin: number | null; thumbUrl: string };
type Season = { number: number; episodes: Ep[] };

/** Liste d'épisodes avec liste déroulante de saisons. */
export default function SeasonEpisodes({ titleId, seasons, lockedIds = [] }: { titleId: string; seasons: Season[]; lockedIds?: string[] }) {
  const locked = new Set(lockedIds);
  const [sel, setSel] = useState(seasons[0]?.number ?? 1);
  const season = seasons.find((s) => s.number === sel) ?? seasons[0];
  if (!season) return <p className="empty">Aucun épisode pour le moment.</p>;

  return (
    <div>
      <div className="row-between">
        <h2>Épisodes</h2>
        <select className="season-select" value={season.number} onChange={(e) => setSel(Number(e.target.value))} aria-label="Choisir la saison">
          {seasons.map((s) => (
            <option key={s.number} value={s.number}>
              Saison {s.number} ({s.episodes.length} ép.)
            </option>
          ))}
        </select>
      </div>
      <ol className="episodes">
        {season.episodes.map((ep) => (
          <li key={ep.id}>
            <Link href={`/watch/${titleId}?ep=${ep.id}`}>
              <span className="num">{ep.number}</span>
              {ep.thumbUrl ? <img src={ep.thumbUrl} alt="" loading="lazy" /> : <div className="ph" />}
              <div>
                <strong>{ep.name}</strong>{locked.has(ep.id) && <span className="lock" title="Réservé aux abonnés">🔒 Abonnés</span>}
                {ep.durationMin ? <span className="meta"> {ep.durationMin} min</span> : null}
                <p>{ep.synopsis}</p>
              </div>
            </Link>
          </li>
        ))}
        {season.episodes.length === 0 && <li className="empty">Aucun épisode dans cette saison.</li>}
      </ol>
    </div>
  );
}
