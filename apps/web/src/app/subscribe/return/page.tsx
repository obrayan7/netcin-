import Link from "next/link";
import { redirect } from "next/navigation";
import { db, markPaymentPaid } from "@netcine/db";
import { fetchTransaction } from "@/lib/fedapay";
import { getViewerId, safeNext } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Retour de FedaPay : on relit la transaction chez eux avant d'accorder l'accès. */
export default async function Return({ searchParams }: { searchParams: Promise<{ p?: string; next?: string }> }) {
  const q = await searchParams;
  const next = safeNext(q.next);
  const viewerId = await getViewerId();
  const payment = q.p && viewerId ? await db.payment.findFirst({ where: { id: q.p, viewerId } }) : null;

  let status = payment?.status ?? "FAILED";
  if (payment && payment.status === "PENDING" && payment.providerRef) {
    try {
      const tx = await fetchTransaction(payment.providerRef);
      if (tx.status === "approved" && tx.amount === payment.amount) {
        await markPaymentPaid(payment.id);
        status = "PAID";
      } else if (tx.status === "declined" || tx.status === "canceled") {
        status = "FAILED";
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (status === "PAID") redirect(next);

  return (
    <main className="sub-page">
      <h1>{status === "FAILED" ? "Paiement non abouti" : "Paiement en cours de confirmation"}</h1>
      <p>
        {status === "FAILED"
          ? "Le paiement a été refusé ou annulé. Vous pouvez réessayer."
          : "Nous attendons la confirmation de l'opérateur. Votre accès s'activera automatiquement ; actualisez cette page dans un instant."}
      </p>
      <p><Link className="btn" href={status === "FAILED" ? `/subscribe?next=${encodeURIComponent(next)}` : next}>{status === "FAILED" ? "Réessayer" : "Continuer"}</Link></p>
    </main>
  );
}
