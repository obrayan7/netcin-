import { db } from "./client";

export type Settings = {
  paidMode: boolean;
  priceAmount: number;
  currency: string;
  freePercent: number;
  periodDays: number;
  lockMovies: boolean;
  manualInstructions: string;
};

export async function getSettings(): Promise<Settings> {
  return db.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

/** Nombre d'épisodes gratuits : 50 % de 24 = 12 ; 0 % = aucun ; 100 % = tous. */
export function freeEpisodeCount(total: number, percent: number): number {
  const p = Math.min(100, Math.max(0, percent));
  return Math.ceil((total * p) / 100);
}

export async function hasActiveSubscription(viewerId: string | null): Promise<boolean> {
  if (!viewerId) return false;
  const s = await db.subscription.findUnique({ where: { viewerId } });
  return !!s && s.expiresAt.getTime() > Date.now();
}

export function formatPrice(amount: number, currency: string): string {
  const n = new Intl.NumberFormat("fr-FR").format(amount).replace(/ | /g, " ");
  if (currency === "XOF" || currency === "XAF") return `${n} F CFA`;
  if (currency === "USD") return `${n} $`;
  return `${n} ${currency}`;
}

/**
 * Valide un paiement et prolonge l'abonnement.
 * Idempotent : appelé plusieurs fois (notifications répétées), il n'accorde la période qu'une fois.
 */
export async function markPaymentPaid(paymentId: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: { not: "PAID" } },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (claimed.count === 0) return false;
    const p = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const cur = await tx.subscription.findUnique({ where: { viewerId: p.viewerId } });
    const base = cur && cur.expiresAt.getTime() > Date.now() ? cur.expiresAt.getTime() : Date.now();
    const expiresAt = new Date(base + p.days * 86_400_000);
    await tx.subscription.upsert({
      where: { viewerId: p.viewerId },
      update: { expiresAt },
      create: { viewerId: p.viewerId, expiresAt },
    });
    return true;
  });
}
