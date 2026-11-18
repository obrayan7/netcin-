import Link from "next/link";
import { formatPrice } from "@netcine/db";

type Props = {
  titleId: string;
  titleName: string;
  loggedIn: boolean;
  price: number;
  currency: string;
  periodDays: number;
  freeCount: number;
  isSeries: boolean;
  /** Chemin à rouvrir après connexion / paiement. */
  next: string;
};

/** Écran affiché à la place du lecteur quand le contenu demande un abonnement. */
export default function Paywall(p: Props) {
  const subscribe = `/subscribe?next=${encodeURIComponent(p.next)}`;
  const period = p.periodDays === 30 ? "mois" : `${p.periodDays} jours`;
  return (
    <div className="paywall" role="alert">
      <h1>Abonnez-vous pour continuer à regarder</h1>
      <p>
        {p.isSeries
          ? `Vous avez vu les ${p.freeCount} premiers épisodes gratuits de « ${p.titleName} ». La suite est réservée aux abonnés.`
          : `« ${p.titleName} » est réservé aux abonnés.`}
      </p>
      <p className="paywall-price">
        <strong>{formatPrice(p.price, p.currency)}</strong> / {period}
      </p>
      <div className="paywall-actions">
        {p.loggedIn ? (
          <Link className="btn" href={subscribe}>S'abonner</Link>
        ) : (
          <>
            <Link className="btn" href={`/register?next=${encodeURIComponent(subscribe)}`}>Créer un compte et s'abonner</Link>
            <Link className="btn ghost" href={`/login?next=${encodeURIComponent(subscribe)}`}>Se connecter</Link>
          </>
        )}
        <Link className="btn ghost" href={`/title/${p.titleId}`}>Retour à la fiche</Link>
      </div>
    </div>
  );
}
