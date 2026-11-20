"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { saveProgress } from "@/app/actions";

type Props = {
  src: string;
  poster?: string;
  titleId: string;
  /** Vide pour un film. */
  episodeId: string;
  /** Position de reprise en secondes (0 = début). */
  startAt: number;
  loggedIn: boolean;
  /** Page où revenir en fermant le lecteur (fiche du titre). */
  closeHref: string;
  /** Épisode suivant (absent pour un film ou le dernier épisode). */
  nextHref?: string;
};

type HlsLike = { destroy: () => void; audioTrack: number };

/**
 * Lecteur : MP4 en natif, HLS (.m3u8) via hls.js.
 * - reprend à la dernière position et l'enregistre toutes les 10 s (si connecté) ;
 * - propose un choix de langue audio quand le flux HLS contient plusieurs pistes.
 */
export default function Player({ src, poster, titleId, episodeId, startAt, loggedIn, closeHref, nextHref }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showUi, setShowUi] = useState(true);
  const [ended, setEnded] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsLike | null>(null);
  const lastSave = useRef(0);
  const [tracks, setTracks] = useState<{ id: number; label: string }[]>([]);
  const [track, setTrack] = useState(0);

  const save = () => {
    const v = ref.current;
    if (!loggedIn || !v || !v.duration || Number.isNaN(v.duration)) return;
    lastSave.current = Date.now();
    void saveProgress(titleId, episodeId, Math.floor(v.currentTime), Math.floor(v.duration));
  };

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let cancelled = false;

    const onMeta = () => {
      if (startAt > 0) video.currentTime = startAt;
    };
    video.addEventListener("loadedmetadata", onMeta);

    if (!src.includes(".m3u8") || video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (cancelled || !Hls.isSupported()) return;
        const hls = new Hls();
        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_e, data) => {
          setTracks(data.audioTracks.map((t, i) => ({ id: i, label: t.name || t.lang || `Piste ${i + 1}` })));
          setTrack(hls.audioTrack);
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hlsRef.current = hls as unknown as HlsLike;
      });
    }

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", onMeta);
      save(); // dernière position avant de quitter la page
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, startAt]);

  // Boutons visibles au mouvement de la souris / au toucher, masqués après 3 s pendant la lecture
  const wake = () => {
    setShowUi(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (ref.current && !ref.current.paused) setShowUi(false);
    }, 3000);
  };
  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  // Plein écran sur le conteneur (et non sur la vidéo seule) pour garder les boutons × et Suivant
  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const ui = showUi || ended ? "ui on" : "ui";

  return (
    <div
      ref={wrapRef}
      className={`player-wrap ${ui}`}
      onMouseMove={wake}
      onTouchStart={wake}
      onKeyDown={wake}
    >
      <video
        ref={ref}
        className="player"
        controls
        autoPlay
        playsInline
        controlsList="nofullscreen"
        poster={poster}
        onTimeUpdate={() => Date.now() - lastSave.current > 10_000 && save()}
        onPause={() => {
          save();
          setShowUi(true);
        }}
        onPlay={() => {
          setEnded(false);
          wake();
        }}
        onEnded={() => {
          save();
          setEnded(true);
        }}
      />

      <div className="player-top">
        <button type="button" className="pbtn" onClick={toggleFullscreen} aria-label="Plein écran" title="Plein écran">⛶</button>
        <Link href={closeHref} className="pbtn close" aria-label="Fermer le lecteur" title="Fermer">✕</Link>
      </div>

      {nextHref && (
        <Link href={nextHref} className={ended ? "next-btn hot" : "next-btn"} aria-label="Épisode suivant">
          Suivant ⏭
        </Link>
      )}
      {tracks.length > 1 && (
        <label className="audio-pick">
          Audio
          <select
            value={track}
            onChange={(e) => {
              const i = Number(e.target.value);
              setTrack(i);
              if (hlsRef.current) hlsRef.current.audioTrack = i;
            }}
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
