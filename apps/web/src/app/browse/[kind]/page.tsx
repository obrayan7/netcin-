import { notFound } from "next/navigation";
import { db } from "@netcine/db";
import Navbar from "@/components/Navbar";
import Grid from "@/components/Grid";
import Footer from "@/components/Footer";
import { withCount } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Browse({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (kind !== "movies" && kind !== "series" && kind !== "anime") notFound();

  const items = await db.title.findMany({
    where: { published: true, type: kind === "movies" ? "MOVIE" : kind === "anime" ? "ANIME" : "SERIES" },
    orderBy: { createdAt: "desc" },
    include: withCount,
  });
  return (
    <>
      <Navbar />
      <main className="page">
        <h1>{kind === "movies" ? "Films" : kind === "anime" ? "Animés" : "Séries"}</h1>
        <Grid items={items} />
      </main>
      <Footer />
    </>
  );
}
