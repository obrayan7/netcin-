import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@netcine/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Grid from "@/components/Grid";
import { getViewerId } from "@/lib/session";
import { withCount } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ma liste · NETCINÉ +" };

export default async function MyList() {
  const viewerId = await getViewerId();
  if (!viewerId) redirect("/login?next=/my-list");

  const rows = await db.myListItem.findMany({
    where: { viewerId },
    orderBy: { createdAt: "desc" },
    include: { title: { include: withCount } },
  });
  const items = rows.map((r) => r.title).filter((t) => t.published);

  return (
    <>
      <Navbar />
      <main className="page">
        <h1>Ma liste</h1>
        {items.length === 0 ? (
          <p className="empty">
            Votre liste est vide. Utilisez le bouton + sur une affiche pour retrouver ici vos films et séries.{" "}
            <Link href="/">Parcourir le catalogue</Link>
          </p>
        ) : (
          <Grid items={items} />
        )}
      </main>
      <Footer />
    </>
  );
}
