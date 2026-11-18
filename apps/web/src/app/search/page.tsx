import { db } from "@netcine/db";
import Navbar from "@/components/Navbar";
import Grid from "@/components/Grid";
import Footer from "@/components/Footer";
import { withCount } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const items = term
    ? await db.title.findMany({
        where: { published: true, name: { contains: term, mode: "insensitive" } },
        orderBy: { name: "asc" },
        take: 60,
        include: withCount,
      })
    : [];
  return (
    <>
      <Navbar />
      <main className="page">
        <h1>{term ? `Résultats pour « ${term} »` : "Recherche"}</h1>
        {term && <Grid items={items} />}
      </main>
      <Footer />
    </>
  );
}
