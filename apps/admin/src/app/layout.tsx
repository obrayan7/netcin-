import type { Metadata } from "next";
import Link from "next/link";
import { Barlow, Instrument_Sans } from "next/font/google";
import { getSession } from "@/lib/auth";
import Logo from "@/components/Logo";
import { logout } from "./actions";
import "./globals.css";

const display = Barlow({ subsets: ["latin"], variable: "--font-display", weight: ["700", "800"], style: ["normal", "italic"] });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "NETCINÉ + · Administration",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="fr">
      <body className={`${display.variable} ${body.variable}`}>
        <div className="admin">
          {session && (
            <header className="admin-nav">
              <Logo href="/" />
              <span className="meta">Administration</span>
              <Link href="/">Titres</Link>
              <Link href="/categories">Catégories</Link>
              <Link href="/users">Membres</Link>
              <Link href="/settings">Abonnement</Link>
              <Link href="/payments">Paiements</Link>
              <a href={siteUrl} target="_blank" rel="noreferrer">Voir le site ↗</a>
              <form action={logout} style={{ marginLeft: "auto" }}>
                <button className="btn ghost">Déconnexion</button>
              </form>
            </header>
          )}
          <main className="admin-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
