import TitleCard from "./TitleCard";
import RowScroller from "./RowScroller";
import type { CardTitle } from "@/lib/catalog";

/** Rangée « Top 10 » : grands chiffres contournés derrière les affiches. L'ordre vient de l'admin. */
export default function Top10Row({ title, items }: { title: string; items: CardTitle[] }) {
  if (items.length === 0) return null;
  return (
    <section className="row">
      <h2>{title}</h2>
      <RowScroller>
        {items.map((t, i) => (
          <div key={t.id} className="t10">
            <span className="rank" aria-hidden>{i + 1}</span>
            <TitleCard t={t} />
          </div>
        ))}
      </RowScroller>
    </section>
  );
}
