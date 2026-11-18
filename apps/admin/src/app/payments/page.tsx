import { db, formatPrice } from "@netcine/db";
import { requireAdmin } from "@/lib/auth";
import { approvePayment, rejectPayment } from "../actions";

export const dynamic = "force-dynamic";

const label: Record<string, string> = { PENDING: "En attente", PAID: "Payé", FAILED: "Refusé / échoué" };

export default async function Payments() {
  await requireAdmin();
  const now = new Date();
  const [active, payments] = await Promise.all([
    db.subscription.count({ where: { expiresAt: { gt: now } } }),
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { viewer: { select: { email: true } } },
    }),
  ]);

  return (
    <>
      <h1>Paiements</h1>
      <p className="meta">
        {active} abonné{active > 1 ? "s" : ""} actif{active > 1 ? "s" : ""}. Les 200 derniers paiements sont affichés.
      </p>
      <table className="table">
        <thead>
          <tr><th>Date</th><th>Membre</th><th>Montant</th><th>Mode</th><th>Référence</th><th>Statut</th><th></th></tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td>{p.createdAt.toLocaleString("fr-FR")}</td>
              <td>{p.viewer.email}</td>
              <td>{formatPrice(p.amount, p.currency)}</td>
              <td>{p.provider === "manual" ? "Manuel" : "En ligne"}</td>
              <td>{p.note || "—"}</td>
              <td className={p.status === "PAID" ? "ok" : p.status === "FAILED" ? "error" : ""}>{label[p.status] ?? p.status}</td>
              <td>
                {p.status === "PENDING" && (
                  <span style={{ display: "flex", gap: ".4rem" }}>
                    <form action={approvePayment.bind(null, p.id)}><button className="btn">Valider</button></form>
                    <form action={rejectPayment.bind(null, p.id)}><button className="btn danger">Refuser</button></form>
                  </span>
                )}
              </td>
            </tr>
          ))}
          {payments.length === 0 && <tr><td colSpan={7}>Aucun paiement pour l'instant.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
