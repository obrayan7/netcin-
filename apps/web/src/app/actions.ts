"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, getSettings } from "@netcine/db";
import { createCheckout, fedapayEnabled } from "@/lib/fedapay";
import { createViewerSession, destroyViewerSession, getViewerId, safeNext } from "@/lib/session";

type AuthState = { error?: string } | undefined;
type ToggleResult = { needAuth?: boolean; value?: boolean };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// Limiteur simple (mémoire du process) : 5 échecs / 15 min par email.
const fails = new Map<string, { n: number; t: number }>();

export async function registerViewer(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = str(formData, "name").slice(0, 60);
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Adresse email invalide." };
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (await db.viewer.findUnique({ where: { email } })) return { error: "Un compte existe déjà avec cet email." };

  const viewer = await db.viewer.create({
    data: { email, name, passwordHash: await bcrypt.hash(password, 12) },
  });
  await createViewerSession(viewer.id);
  redirect(safeNext(formData.get("next")));
}

export async function loginViewer(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  const f = fails.get(email);
  if (f && Date.now() - f.t < 15 * 60_000 && f.n >= 5) return { error: "Trop de tentatives, réessayez dans quelques minutes." };

  const viewer = await db.viewer.findUnique({ where: { email } });
  const ok = viewer ? await bcrypt.compare(password, viewer.passwordHash) : false;
  if (!viewer || !ok) {
    const cur = f && Date.now() - f.t < 15 * 60_000 ? f : { n: 0, t: Date.now() };
    fails.set(email, { n: cur.n + 1, t: cur.t });
    return { error: "Email ou mot de passe incorrect." };
  }
  fails.delete(email);
  await createViewerSession(viewer.id);
  redirect(safeNext(formData.get("next")));
}

export async function logoutViewer() {
  await destroyViewerSession();
  redirect("/");
}

/** Id du spectateur, seulement si son compte existe encore. */
async function currentViewerId(): Promise<string | null> {
  const id = await getViewerId();
  if (!id) return null;
  const v = await db.viewer.findUnique({ where: { id }, select: { id: true } });
  return v?.id ?? null;
}

export async function toggleMyList(titleId: string): Promise<ToggleResult> {
  const viewerId = await currentViewerId();
  if (!viewerId) return { needAuth: true };
  const key = { viewerId_titleId: { viewerId, titleId } };
  try {
    const existing = await db.myListItem.findUnique({ where: key });
    if (existing) await db.myListItem.delete({ where: key });
    else await db.myListItem.create({ data: { viewerId, titleId } });
    revalidatePath("/my-list");
    return { value: !existing };
  } catch {
    return { value: false };
  }
}

export async function toggleLike(titleId: string): Promise<ToggleResult> {
  const viewerId = await currentViewerId();
  if (!viewerId) return { needAuth: true };
  const key = { viewerId_titleId: { viewerId, titleId } };
  try {
    const existing = await db.like.findUnique({ where: key });
    if (existing) await db.like.delete({ where: key });
    else await db.like.create({ data: { viewerId, titleId } });
    return { value: !existing };
  } catch {
    return { value: false };
  }
}

/** Enregistre la position de lecture (appelée régulièrement par le lecteur). */
export async function saveProgress(titleId: string, episodeId: string, position: number, duration: number) {
  const viewerId = await currentViewerId();
  if (!viewerId) return;
  if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0 || position < 0) return;
  const data = { position: Math.floor(position), duration: Math.floor(duration) };
  try {
    await db.watchProgress.upsert({
      where: { viewerId_titleId_episodeId: { viewerId, titleId, episodeId } },
      update: data,
      create: { viewerId, titleId, episodeId, ...data },
    });
  } catch {
    /* titre supprimé entre-temps : on ignore */
  }
}

// ---------- Abonnement ----------

const siteUrl = () => (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Crée le paiement puis envoie le spectateur sur la page de paiement FedaPay. */
export async function startCheckout(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const viewerId = await getViewerId();
  if (!viewerId) redirect(`/login?next=${encodeURIComponent(`/subscribe?next=${next}`)}`);
  const settings = await getSettings();
  if (!settings.paidMode) redirect(next);
  if (!fedapayEnabled()) redirect(`/subscribe?next=${encodeURIComponent(next)}&error=config`);

  const viewer = await db.viewer.findUniqueOrThrow({ where: { id: viewerId } });
  const payment = await db.payment.create({
    data: { viewerId, amount: settings.priceAmount, currency: settings.currency, days: settings.periodDays, provider: "fedapay" },
  });

  let url = "";
  try {
    const r = await createCheckout({
      amount: payment.amount,
      currency: payment.currency,
      description: "Abonnement NETCINE+",
      email: viewer.email,
      name: viewer.name,
      callbackUrl: `${siteUrl()}/subscribe/return?p=${payment.id}&next=${encodeURIComponent(next)}`,
      paymentId: payment.id,
    });
    await db.payment.update({ where: { id: payment.id }, data: { providerRef: r.ref } });
    url = r.url;
  } catch (e) {
    console.error(e);
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
  }
  if (!url) redirect(`/subscribe?next=${encodeURIComponent(next)}&error=pay`);
  redirect(url);
}

/** Paiement hors plateforme (Wave, Orange Money…) : le client déclare sa référence, l'admin valide. */
export async function submitManualPayment(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const viewerId = await getViewerId();
  if (!viewerId) redirect(`/login?next=${encodeURIComponent(`/subscribe?next=${next}`)}`);
  const note = str(formData, "note").slice(0, 200);
  if (!note) redirect(`/subscribe?next=${encodeURIComponent(next)}&error=note`);
  const settings = await getSettings();
  await db.payment.create({
    data: { viewerId, amount: settings.priceAmount, currency: settings.currency, days: settings.periodDays, provider: "manual", note },
  });
  redirect(`/subscribe?next=${encodeURIComponent(next)}&sent=1`);
}
