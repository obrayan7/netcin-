import Link from "next/link";
import { db } from "@netcine/db";
import { requireAdmin } from "@/lib/auth";
import AddSeasonForm from "./AddSeasonForm";

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  title: "Choisissez une série existante.",
  number: "Indiquez le numéro de la saison.",
  empty: "Aucun épisode envoyé : choisissez le dossier puis cliquez sur « Envoyer les vidéos ».",
};

export default async function NewSeason({ searchParams }: { searchParams: Promise<{ titleId?: string; error?: string }> }) {
  await requireAdmin();
  const q = await searchParams;
  const titles = await db.title.findMany({
    where: { type: { in: ["SERIES", "ANIME"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true, seasons: { select: { number: true }, orderBy: { number: "asc" } } },
  });
  const series = titles.map((t) => ({ id: t.id, name: t.name, type: t.type, seasons: t.seasons.map((s) => s.number) }));
  const initialId = series.some((s) => s.id === q.titleId) ? q.titleId! : "";

  return (
    <>
      <h1>Ajouter une saison à une série existante</h1>
      <p className="meta">
        Choisissez la série, le numéro de la saison (la suivante est proposée) et le dossier qui contient ses épisodes.
      </p>
      {q.error && <p className="error">{errors[q.error] ?? "Une erreur est survenue."}</p>}
      {series.length === 0 ? (
        <p>
          Aucune série pour l'instant. <Link href="/titles/new">Ajoutez-en une</Link> d'abord.
        </p>
      ) : (
        <AddSeasonForm series={series} initialId={initialId} />
      )}
    </>
  );
}
