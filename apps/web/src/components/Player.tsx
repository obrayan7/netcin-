"use client";

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
};

type HlsLike = { destroy: () => void; audioTrack: number };

/**
 * Lecteur : MP4 en natif, HLS (.m3u8) via hls.js.
 * - reprend à la dernière position et l'enregistre toutes les 10 s (si connecté) ;
 * - propose un choix de langue audio quand le flux HLS contient plusieurs pistes.
 */
export default function Player({ src, poster, titleId, episodeId, startAt, loggedIn }: Props) {
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

  return (
    <div className="player-wrap">
      <video
        ref={ref}
        className="player"
        controls
        autoPlay
        playsInline
        poster={poster}
        onTimeUpdate={() => Date.now() - lastSave.current > 10_000 && save()}
        onPause={save}
        onEnded={save}
      />
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
