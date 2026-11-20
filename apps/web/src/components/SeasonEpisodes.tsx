"use client";

import Link from "next/link";
import { useState } from "react";

type Ep = { id: string; number: number; name: string; synopsis: string; durationMin: number | null; thumbUrl: string };
type Season = { number: number; episodes: Ep[] };

const FIRST = 10; // épisodes visibles avant « Afficher tout »

/**
 * Épisodes d'une série : liste déroulante des saisons, puis les épisodes de la saison choisie
 * (numéro, miniature avec lecture au survol et barre de progression, titre, durée, résumé).
 */
export default function SeasonEpisodes({
  titleId,
  seasons,
  lockedIds = [],
  progress = {},
  initialSeason,
}: {
  titleId: string;
  seasons: Season[];
  lockedIds?: string[];
  /** Pourcentage regardé par épisode (spectateur connecté). */
  progress?: Record<string, number>;
  initialSeason?: number;
}) {
  const locked = new Set(lockedIds);
  const [sel, setSel] = useState(initialSeason ?? seasons[0]?.number ?? 1);
  const [all, setAll] = useState(false);
  const season = seasons.find((s) => s.number === sel) ?? seasons[0];
  if (!season) return <p className="empty">Aucun épisode pour le moment.</p>;

  const shown = all ? season.episodes : season.episodes.slice(0, FIRST);

  return (
    <div>
      <div className="row-between">
        <h2>Épisodes</h2>
        <select
          className="season-select"
          value={season.number}
          onChange={(e) => {
            setSel(Number(e.target.value));
            setAll(false);
          }}
          aria-label="Choisir la saison"
        >
          {seasons.map((s) => (
            <option key={s.number} value={s.number}>
              Saison {s.number} ({s.episodes.length} ÉP.)
            </option>
          ))}
        </select>
      </div>

      <ol className="episodes">
        {shown.map((ep) => {
          const p = progress[ep.id] ?? 0;
          return (
            <li key={ep.id}>
              <Link href={`/watch/${titleId}?ep=${ep.id}`}>
                <span className="num">{ep.number}</span>
                <div className="ep-thumb">
                  {ep.thumbUrl ? <img src={ep.thumbUrl} alt="" loading="lazy" /> : <div className="ph" />}
                  <span className="ep-play" aria-hidden>▶</span>
                  {p > 0 && (
                    <i className="ep-bar" aria-label={`${p} % regardé`}>
                      <b style={{ width: `${Math.min(100, p)}%` }} />
                    </i>
                  )}
                </div>
                <div className="ep-body">
                  <div className="ep-head">
                    <strong>
                      {ep.name}
                      {locked.has(ep.id) && <span className="lock" title="Réservé aux abonnés">🔒 Abonnés</span>}
                    </strong>
                    {ep.durationMin ? <span className="ep-dur">{ep.durationMin} min</span> : null}
                  </div>
                  {ep.synopsis && <p>{ep.synopsis}</p>}
                </div>
              </Link>
            </li>
          );
        })}
        {season.episodes.length === 0 && <li className="empty">Aucun épisode dans cette saison.</li>}
      </ol>

      {season.episodes.length > FIRST && (
        <button type="button" className="more-eps" onClick={() => setAll(!all)} aria-expanded={all}>
          {all ? "▲ Réduire" : `▼ Afficher les ${season.episodes.length - FIRST} autres épisodes`}
        </button>
      )}
    </div>
  );
}
