import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="footer">
      <Logo height={38} />
      <p>Films et séries en streaming. Ajoutez vos titres à Ma liste, reprenez la lecture là où vous vous êtes arrêté.</p>
      <nav aria-label="Pied de page">
        <Link href="/">Accueil</Link>
        <Link href="/browse/series">Séries</Link>
        <Link href="/browse/movies">Films</Link>
        <Link href="/my-list">Ma liste</Link>
      </nav>
      <small>© {new Date().getFullYear()} NETCINÉ +. Tous droits réservés.</small>
    </footer>
  );
}
