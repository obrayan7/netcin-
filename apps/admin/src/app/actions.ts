"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, markPaymentPaid } from "@netcine/db";
import { createSession, destroySession, requireAdmin } from "@/lib/auth";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => {
  const n = parseInt(str(f, k), 10);
  return Number.isFinite(n) ? n : null;
};
const refresh = () => revalidatePath("/", "layout");

// ---------- Auth ----------

// Limiteur très simple (mémoire du process) : 5 échecs / 15 min par email.
const fails = new Map<string, { n: number; t: number }>();

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  const f = fails.get(email);
  if (f && Date.now() - f.t < 15 * 60_000 && f.n >= 5) return { error: "Trop de tentatives, réessayez plus tard." };

  const admin = await db.adminUser.findUnique({ where: { email } });
  const ok = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
  if (!admin || !ok) {
    const cur = f && Date.now() - f.t < 15 * 60_000 ? f : { n: 0, t: Date.now() };
    fails.set(email, { n: cur.n + 1, t: cur.t });
    return { error: "Email ou mot de passe incorrect." };
  }
  fails.delete(email);
  await createSession(admin.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ---------- Titres ----------

export async function saveTitle(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!name) throw new Error("Le nom est requis");

  const data = {
    type: str(formData, "type") === "SERIES" ? ("SERIES" as const) : ("MOVIE" as const),
    name,
    synopsis: str(formData, "synopsis"),
    year: int(formData, "year"),
    ageRating: str(formData, "ageRating"),
    posterUrl: str(formData, "posterUrl"),
    backdropUrl: str(formData, "backdropUrl"),
    videoUrl: str(formData, "videoUrl"),
    durationMin: int(formData, "durationMin"),
    featured: formData.get("featured") === "on",
    published: formData.get("published") === "on",
    top10Rank: (() => {
      const n = int(formData, "top10Rank");
      return n !== null && n >= 1 && n <= 10 ? n : null;
    })(),
    cast: str(formData, "cast"),
    genres: str(formData, "genres"),
    mood: str(formData, "mood"),
    languages: str(formData, "languages"),
  };
  const categoryIds = formData.getAll("categoryIds").map(String);

  if (id) {
    await db.title.update({ where: { id }, data: { ...data, categories: { set: categoryIds.map((c) => ({ id: c })) } } });
    refresh();
    redirect(`/titles/${id}?saved=1`);
  }
  const created = await db.title.create({ data: { ...data, categories: { connect: categoryIds.map((c) => ({ id: c })) } } });
  refresh();
  redirect(`/titles/${created.id}?saved=1`);
}

export async function deleteTitle(id: string) {
  await requireAdmin();
  await db.title.delete({ where: { id } });
  refresh();
  redirect("/");
}

// ---------- Saisons / épisodes ----------

export async function addSeason(titleId: string, formData: FormData) {
  await requireAdmin();
  const number = int(formData, "number");
  if (!number || number < 1) return;
  await db.season.upsert({
    where: { titleId_number: { titleId, number } },
    update: {},
    create: { titleId, number },
  });
  refresh();
  revalidatePath(`/titles/${titleId}`);
}

export async function deleteSeason(titleId: string, seasonId: string) {
  await requireAdmin();
  await db.season.delete({ where: { id: seasonId } });
  refresh();
  revalidatePath(`/titles/${titleId}`);
}

export async function saveEpisode(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const seasonId = str(formData, "seasonId");
  const titleId = str(formData, "titleId");
  const number = int(formData, "number");
  const name = str(formData, "name");
  if (!seasonId || !number || !name) return;

  const data = {
    name,
    synopsis: str(formData, "synopsis"),
    durationMin: int(formData, "durationMin"),
    thumbUrl: str(formData, "thumbUrl"),
    videoUrl: str(formData, "videoUrl"),
  };
  if (id) {
    await db.episode.update({ where: { id }, data: { ...data, number } });
  } else {
    await db.episode.upsert({
      where: { seasonId_number: { seasonId, number } },
      update: data,
      create: { ...data, seasonId, number },
    });
    // alimente le badge « Nouvel épisode » et la cloche de notifications du site
    if (titleId) await db.title.update({ where: { id: titleId }, data: { lastEpisodeAt: new Date() } });
  }
  refresh();
  revalidatePath(`/titles/${titleId}`);
}

export async function deleteEpisode(titleId: string, episodeId: string) {
  await requireAdmin();
  await db.episode.delete({ where: { id: episodeId } });
  refresh();
  revalidatePath(`/titles/${titleId}`);
}

// ---------- Catégories (rangées de l'accueil) ----------

export async function saveCategory(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const name = str(formData, "name");
  const order = int(formData, "order") ?? 0;
  if (!name) return;
  if (id) await db.category.update({ where: { id }, data: { name, order } });
  else await db.category.create({ data: { name, order } });
  refresh();
  revalidatePath("/categories");
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  await db.category.delete({ where: { id } });
  refresh();
  revalidatePath("/categories");
}

// ---------- Abonnement ----------

export async function saveSettings(formData: FormData) {
  await requireAdmin();
  const price = int(formData, "priceAmount");
  const percent = int(formData, "freePercent");
  const days = int(formData, "periodDays");
  const currency = ["XOF", "XAF", "USD"].includes(str(formData, "currency")) ? str(formData, "currency") : "XOF";
  if (price === null || price < 0) redirect("/settings?error=price");
  const data = {
    paidMode: formData.get("paidMode") === "on",
    priceAmount: price,
    currency,
    freePercent: Math.min(100, Math.max(0, percent ?? 50)),
    periodDays: Math.max(1, days ?? 30),
    lockMovies: formData.get("lockMovies") === "on",
    manualInstructions: str(formData, "manualInstructions"),
  };
  await db.siteSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  refresh();
  redirect("/settings?saved=1");
}

// Validation manuelle (quand le client a payé par Wave / Orange Money… hors plateforme)
export async function approvePayment(id: string) {
  await requireAdmin();
  await markPaymentPaid(id);
  revalidatePath("/payments");
}

export async function rejectPayment(id: string) {
  await requireAdmin();
  await db.payment.updateMany({ where: { id, status: "PENDING" }, data: { status: "FAILED" } });
  revalidatePath("/payments");
}
