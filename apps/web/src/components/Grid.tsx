import TitleCard from "./TitleCard";
import type { CardTitle } from "@/lib/catalog";

export default function Grid({ items, empty = "Aucun résultat." }: { items: CardTitle[]; empty?: string }) {
  if (items.length === 0) return <p className="empty">{empty}</p>;
  return (
    <div className="grid-titles">
      {items.map((t) => (
        <TitleCard key={t.id} t={t} />
      ))}
    </div>
  );
}
