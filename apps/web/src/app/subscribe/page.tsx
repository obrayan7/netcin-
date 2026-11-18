import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPrice, getSettings, hasActiveSubscription, db } from "@netcine/db";
import Logo from "@/components/Logo";
import { fedapayEnabled } from "@/lib/fedapay";
import { getViewerId, safeNext } from "@/lib/session";
import { startCheckout, submitManualPayment } from "../actions";

export const metadata = { title: "Abonnement · NETCINÉ +" };
export const dynamic = "force-dynamic";

export default async function Subscribe({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; sent?: string }> }) {
  const q = await searchParams;
  const next = safeNext(q.next);
  const viewerId = await getViewerId();
  if (!viewerId) redirect(`/login?next=${encodeURIComponent(`/subscribe?next=${next}`)}`);

  const settings = await getSettings();
  const sub = await db.subscription.findUnique({ where: { viewerId } });
  const active = await hasActiveSubscription(viewerId);
  const online = fedapayEnabled();
  const manual = settings.manualInstructions.trim().length > 0;
  const period = settings.periodDays === 30 ? "mois" : `${settings.periodDays} jours`;

  return (
    <main className="sub-page">
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}><Logo height={56} /></div>
      <h1>Abonnement</h1>

      {!settings.paidMode ? (
        <p>Tout le catalogue est actuellement gratuit. Aucun abonnement n'est nécessaire.</p>
      ) : (
        <>
          <p>
            <strong>{formatPrice(settings.priceAmount, settings.currency)}</strong> / {period} — accès à tous les épisodes et films.
          </p>
          {active && sub && (
            <p className="sub-ok">Abonnement actif jusqu'au {sub.expiresAt.toLocaleDateString("fr-FR")}. Payer à nouveau prolonge la période.</p>
          )}
          {q.sent && <p className="sub-ok">Paiement déclaré. Votre accès sera activé dès validation (quelques minutes à quelques heures).</p>}
          {q.error === "pay" && <p className="sub-error">Le paiement n'a pas pu démarrer. Réessayez dans un instant.</p>}
          {q.error === "config" && <p className="sub-error">Le paiement en ligne n'est pas disponible pour le moment.</p>}
          {q.error === "note" && <p className="sub-error">Indiquez votre numéro de transaction.</p>}

          {online && (
            <form action={startCheckout} className="sub-box">
              <input type="hidden" name="next" value={next} />
              <p className="meta">Mobile Money (MTN, Moov, Wave…) ou carte bancaire, via FedaPay.</p>
              <button className="btn">Payer {formatPrice(settings.priceAmount, settings.currency)}</button>
            </form>
          )}

          {manual && (
            <form action={submitManualPayment} className="sub-box">
              <input type="hidden" name="next" value={next} />
              <p style={{ whiteSpace: "pre-line" }}>{settings.manualInstructions}</p>
              <input name="note" placeholder="Numéro de transaction ou nom de l'expéditeur" maxLength={200} />
              <button className="btn ghost" style={{ marginTop: ".7rem" }}>J'ai payé</button>
            </form>
          )}

          {!online && !manual && <p className="sub-error">Aucun moyen de paiement n'est configuré pour l'instant.</p>}
        </>
      )}

      <p style={{ marginTop: "1.5rem" }}><Link href={next}>← Retour</Link></p>
    </main>
  );
}
