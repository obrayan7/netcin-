import { db } from "@netcine/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Row from "@/components/Row";
import Top10Row from "@/components/Top10Row";
import Hero3D, { type HeroItem } from "@/components/Hero3D";
import { getViewerId } from "@/lib/session";
import { withCount } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const viewerId = await getViewerId();

  const [heroTitles, recent, top10, categories, progressRows, listRows] = await Promise.all([
    db.title.findMany({
      where: { published: true, OR: [{ posterUrl: { not: "" } }, { backdropUrl: { not: "" } }] },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 9,
    }),
    db.title.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 20, include: withCount }),
    db.title.findMany({ where: { published: true, top10Rank: { not: null } }, orderBy: { top10Rank: "asc" }, take: 10, include: withCount }),
    db.category.findMany({
      orderBy: { order: "asc" },
      include: { titles: { where: { published: true }, orderBy: { createdAt: "desc" }, include: withCount } },
    }),
    viewerId
      ? db.watchProgress.findMany({
          where: { viewerId },
          orderBy: { updatedAt: "desc" },
          distinct: ["titleId"],
          take: 20,
          include: { title: { include: withCount } },
        })
      : Promise.resolve([]),
    viewerId
      ? db.myListItem.findMany({ where: { viewerId }, orderBy: { createdAt: "desc" }, take: 20, include: { title: { include: withCount } } })
      : Promise.resolve([]),
  ]);

  const heroItems: HeroItem[] = heroTitles.map((t) => ({
    id: t.id,
    name: t.name,
    synopsis: t.synopsis,
    posterUrl: t.posterUrl,
    backdropUrl: t.backdropUrl,
    type: t.type,
    year: t.year,
    ageRating: t.ageRating,
  }));

  // « Reprendre la lecture » : on masque les titres terminés (> 95 %)
  const resume = progressRows.filter((r) => r.title.published && !(r.duration > 0 && r.position / r.duration > 0.95));
  const progress: Record<string, number> = {};
  for (const r of resume) progress[r.titleId] = r.duration > 0 ? Math.round((r.position / r.duration) * 100) : 0;
  const myList = listRows.map((r) => r.title).filter((t) => t.published);

  return (
    <>
      <Navbar />
      <Hero3D items={heroItems} />
      <main className="rows">
        <Row title="Reprendre la lecture" items={resume.map((r) => r.title)} progress={progress} />
        <Row title="Ma liste" items={myList} />
        <Top10Row title="Top 10 du moment" items={top10} />
        <Row title="Ajouts récents" items={recent} />
        {categories.map((c) => (
          <Row key={c.id} title={c.name} items={c.titles} />
        ))}
      </main>
      <Footer />
    </>
  );
}
