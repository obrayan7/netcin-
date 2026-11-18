import TitleCard from "./TitleCard";
import RowScroller from "./RowScroller";
import type { CardTitle } from "@/lib/catalog";

type Props = {
  title: string;
  items: CardTitle[];
  /** Pourcentage de lecture par id de titre (rangée « Reprendre la lecture »). */
  progress?: Record<string, number>;
};

export default function Row({ title, items, progress }: Props) {
  if (items.length === 0) return null;
  return (
    <section className="row">
      <h2>{title}</h2>
      <RowScroller>
        {items.map((t) => (
          <TitleCard key={t.id} t={t} progress={progress?.[t.id]} />
        ))}
      </RowScroller>
    </section>
  );
}
