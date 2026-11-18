import { db, markPaymentPaid } from "@netcine/db";
import { fetchTransaction } from "@/lib/fedapay";

export const dynamic = "force-dynamic";

/**
 * Webhook FedaPay (Workbench → Webhooks → URL : https://VOTRE-SITE/api/fedapay/webhook,
 * événements transaction.approved / declined / canceled).
 * On ne se fie pas au contenu reçu : on relit la transaction via l'API avec la clé secrète.
 * Filet de sécurité quand le spectateur ferme l'onglet avant le retour sur le site.
 */
export async function POST(req: Request) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const body: any = await req.json().catch(() => ({}));
  const ref = String(body?.entity?.id ?? body?.object_id ?? body?.id ?? "");
  if (!ref) return new Response("ignored", { status: 200 });

  const payment = await db.payment.findFirst({ where: { provider: "fedapay", providerRef: ref } });
  if (!payment || payment.status === "PAID") return new Response("ok", { status: 200 });

  try {
    const tx = await fetchTransaction(ref);
    if (tx.status === "approved" && tx.amount === payment.amount) await markPaymentPaid(payment.id);
    else if (tx.status === "declined" || tx.status === "canceled")
      await db.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED" } });
  } catch (e) {
    console.error(e);
    return new Response("retry", { status: 500 }); // FedaPay réessaiera
  }
  return new Response("ok", { status: 200 });
}
