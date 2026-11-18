"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { logoutViewer } from "@/app/actions";

export type NewsItem = { id: string; name: string; posterUrl: string; label: string; at: number };
type Props = { viewer: { initial: string; name: string } | null; news: NewsItem[] };

const links = [
  { href: "/", label: "Accueil" },
  { href: "/browse/series", label: "Séries" },
  { href: "/browse/movies", label: "Films" },
  { href: "/my-list", label: "Ma liste" },
];

export default function NavbarClient({ viewer, news }: Props) {
  const path = usePathname();
  const [solid, setSolid] = useState(false);
  const [menu, setMenu] = useState<"bell" | "user" | null>(null);
  const [seen, setSeen] = useState<number | null>(null); // null tant que non monté (évite un écart d'hydratation)
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    try {
      setSeen(Number(localStorage.getItem("nc_seen") || 0));
    } catch {
      setSeen(0);
    }
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const unread = seen === null ? 0 : news.filter((n) => n.at > seen).length;
  const openBell = () => {
    const next = menu === "bell" ? null : "bell";
    setMenu(next);
    if (next) {
      const now = Date.now();
      try {
        localStorage.setItem("nc_seen", String(now));
      } catch {
        /* stockage indisponible : le point rouge reviendra */
      }
      setSeen(now);
    }
  };

  return (
    <nav className={solid ? "navbar solid" : "navbar"}>
      <Logo />
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={path === l.href ? "navlink on" : "navlink"}>
          {l.label}
        </Link>
      ))}
      <form action="/search" className="search" role="search">
        <input name="q" placeholder="Rechercher un film ou une série" aria-label="Rechercher" />
      </form>

      <div className="menu-wrap" ref={wrap}>
        <button type="button" className="icon-btn" onClick={openBell} aria-label="Nouveautés" aria-expanded={menu === "bell"}>
          🔔{unread > 0 && <span className="bell-dot">{unread}</span>}
        </button>
        {menu === "bell" && (
          <div className="dropdown news" role="menu">
            <p className="meta" style={{ margin: ".3rem .7rem" }}>Nouveautés</p>
            {news.length === 0 && <p className="meta" style={{ margin: ".5rem .7rem" }}>Rien de nouveau pour le moment.</p>}
            {news.map((n) => (
              <Link key={n.id} href={`/title/${n.id}`} className="news-item" onClick={() => setMenu(null)}>
                {n.posterUrl ? <img src={n.posterUrl} alt="" /> : <span className="ph" />}
                <span>
                  <strong>{n.name}</strong>
                  <small>{n.label}</small>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {viewer ? (
        <div className="menu-wrap">
          <button type="button" className="avatar" onClick={() => setMenu(menu === "user" ? null : "user")} aria-label={`Compte de ${viewer.name}`} aria-expanded={menu === "user"}>
            {viewer.initial}
          </button>
          {menu === "user" && (
            <div className="dropdown" role="menu">
              <p className="meta" style={{ margin: ".3rem .7rem" }}>{viewer.name}</p>
              <Link href="/my-list" onClick={() => setMenu(null)}>Ma liste</Link>
              <form action={logoutViewer}>
                <button type="submit">Se déconnecter</button>
              </form>
            </div>
          )}
        </div>
      ) : (
        <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn" style={{ padding: ".45rem 1rem" }}>
          Se connecter
        </Link>
      )}
    </nav>
  );
}
