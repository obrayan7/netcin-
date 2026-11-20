"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";

export type HeroItem = {
  id: string;
  name: string;
  synopsis: string;
  posterUrl: string;
  backdropUrl: string;
  type: "MOVIE" | "SERIES" | "ANIME";
  year: number | null;
  ageRating: string;
};

/**
 * Anneau 3D d'affiches (CSS 3D pur, aucune dépendance) :
 * rotation lente, glisser pour tourner, inclinaison à la souris, clic sur une affiche latérale pour l'amener devant.
 */
export default function Hero3D({ items }: { items: HeroItem[] }) {
  const ring = useMemo(() => {
    if (items.length === 0) return [];
    const m = Math.max(7, items.length);
    return Array.from({ length: m }, (_, i) => items[i % items.length]);
  }, [items]);
  const m = ring.length;
  const step = m ? 360 / m : 0;

  const [cw, setCw] = useState(200);
  const [active, setActive] = useState(0);
  const radius = m ? Math.round(cw / 2 / Math.tan(Math.PI / m)) + 90 : 0;

  const ringRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const target = useRef<number | null>(null);
  const hover = useRef(false);
  const drag = useRef<{ x: number; a: number } | null>(null);
  const moved = useRef(false);
  const activeRef = useRef(0);
  const geo = useRef({ radius, step, m });
  geo.current = { radius, step, m };

  useEffect(() => {
    const f = () => setCw(window.innerWidth < 700 ? 124 : window.innerWidth < 1100 ? 170 : 236);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  useEffect(() => {
    if (!m) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();

    const paint = () => {
      const g = geo.current;
      if (ringRef.current) ringRef.current.style.transform = `translateZ(${-g.radius}px) rotateY(${angle.current}deg)`;
      const idx = ((Math.round(-angle.current / g.step) % g.m) + g.m) % g.m;
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }
    };
    const tick = (t: number) => {
      const dt = Math.min(t - last, 50);
      last = t;
      if (target.current !== null) {
        const d = target.current - angle.current;
        angle.current += d * 0.12;
        if (Math.abs(d) < 0.05) {
          angle.current = target.current;
          target.current = null;
        }
      } else if (!hover.current && !drag.current && !reduce) {
        angle.current -= dt * 0.006; // ~6°/s
      }
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [m]);

  const snap = () => {
    target.current = Math.round(angle.current / geo.current.step) * geo.current.step;
  };
  const go = (dir: 1 | -1) => {
    const s = geo.current.step;
    const base = Math.round((target.current ?? angle.current) / s) * s;
    target.current = base - dir * s;
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, a: angle.current };
    moved.current = false;
    target.current = null;
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    if (tiltRef.current) tiltRef.current.style.transform = `rotateX(${(-ny * 7).toFixed(2)}deg) rotateY(${(nx * 9).toFixed(2)}deg)`;
    if (drag.current) {
      const dx = e.clientX - drag.current.x;
      if (Math.abs(dx) > 6) moved.current = true;
      angle.current = drag.current.a + dx * 0.35;
    }
  };
  const onUp = () => {
    if (drag.current) {
      drag.current = null;
      snap();
    }
  };
  const onLeave = () => {
    hover.current = false;
    onUp();
    if (tiltRef.current) tiltRef.current.style.transform = "";
  };
  const onCard = (e: MouseEvent, i: number) => {
    if (moved.current) {
      e.preventDefault();
      moved.current = false;
      return;
    }
    if (i !== activeRef.current) {
      e.preventDefault();
      const base = -i * geo.current.step;
      target.current = base + 360 * Math.round((angle.current - base) / 360);
    }
  };

  if (!m) {
    return (
      <section className="h3d splash">
        <div className="h3d-copy">
          <img src="/logo.png" alt="NETCINÉ +" className="splash-logo" />
          <p className="syn">Le catalogue arrive bientôt.</p>
        </div>
      </section>
    );
  }

  const cur = ring[active];
  const bg = cur.backdropUrl || cur.posterUrl;
  const meta = [cur.type === "SERIES" ? "Série" : cur.type === "ANIME" ? "Animé" : "Film", cur.year, cur.ageRating].filter(Boolean);

  return (
    <section className="h3d">
      <div key={cur.id} className="h3d-bg" style={{ backgroundImage: `url("${bg}")` }} aria-hidden />
      <div className="h3d-velvet" aria-hidden />

      <div className="h3d-copy">
        <h1 key={cur.id}>{cur.name}</h1>
        <p className="h3d-meta">
          {meta.map((x, i) => (
            <span key={i}>{x}</span>
          ))}
        </p>
        <p className="syn">{cur.synopsis}</p>
        <div className="hero-actions">
          <Link className="btn" href={`/watch/${cur.id}`}>Regarder</Link>
          <Link className="btn ghost" href={`/title/${cur.id}`}>Détails</Link>
        </div>
      </div>

      <div
        className="h3d-stage"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerEnter={() => (hover.current = true)}
        onPointerLeave={onLeave}
      >
        <div className="h3d-beam" aria-hidden />
        <div className="h3d-tilt" ref={tiltRef}>
          <div
            className="h3d-ring"
            ref={ringRef}
            style={{ width: cw, height: cw * 1.5, marginLeft: -cw / 2, marginTop: -cw * 0.75 }}
          >
            {ring.map((it, i) => (
              <Link
                key={i}
                href={`/title/${it.id}`}
                className={i === active ? "h3d-card front" : "h3d-card"}
                style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)` }}
                onClick={(e) => onCard(e, i)}
                aria-label={it.name}
                draggable={false}
              >
                <img src={it.posterUrl || it.backdropUrl} alt="" draggable={false} />
              </Link>
            ))}
          </div>
          <div className="h3d-floor" aria-hidden />
        </div>
        <div className="h3d-nav">
          <button type="button" onClick={() => go(-1)} aria-label="Affiche précédente">‹</button>
          <button type="button" onClick={() => go(1)} aria-label="Affiche suivante">›</button>
        </div>
      </div>
    </section>
  );
}
