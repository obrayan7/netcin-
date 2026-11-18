import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TitleDetail from "@/components/TitleDetail";

export const dynamic = "force-dynamic";

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Navbar />
      <main className="td-page">
        <div className="td-card">
          <TitleDetail id={id} />
        </div>
      </main>
      <Footer />
    </>
  );
}
