import Modal from "@/components/Modal";
import TitleDetail from "@/components/TitleDetail";

export const dynamic = "force-dynamic";

// Route interceptée : un clic sur une affiche ouvre la fiche en superposition,
// tandis que l'adresse /title/[id] reste ouvrable directement (page complète).
export default async function TitleModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Modal>
      <TitleDetail id={id} />
    </Modal>
  );
}
