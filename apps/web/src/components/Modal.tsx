"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/** Fenêtre de détail en superposition : Échap, clic à l'extérieur ou ✕ pour fermer. */
export default function Modal({ children }: { children: ReactNode }) {
  const router = useRouter();
  const close = () => router.back();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.back();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [router]);

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-x" onClick={close} aria-label="Fermer">✕</button>
        {children}
      </div>
    </div>
  );
}
