"use client";

import { useRef, type ReactNode } from "react";

/** Rangée à défilement horizontal avec flèches (visibles au survol). */
export default function RowScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <div className="row-wrap">
      <button type="button" className="arrow left" onClick={() => scroll(-1)} aria-label="Défiler vers la gauche">‹</button>
      <div className="row-scroll" ref={ref}>{children}</div>
      <button type="button" className="arrow right" onClick={() => scroll(1)} aria-label="Défiler vers la droite">›</button>
    </div>
  );
}
