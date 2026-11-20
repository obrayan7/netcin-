"use client";

import { useState } from "react";
import SeasonImport from "@/components/SeasonImport";
import { importSeason } from "../../actions";

export type SeriesOption = { id: string; name: string; type: string; seasons: number[] };

export default function AddSeasonForm({ series, initialId }: { series: SeriesOption[]; initialId: string }) {
  const nextFor = (id: string) => String(Math.max(0, ...(series.find((s) => s.id === id)?.seasons ?? [])) + 1);
  const [titleId, setTitleId] = useState(initialId);
  const [number, setNumber] = useState(nextFor(initialId));
  const current = series.find((s) => s.id === titleId);

  return (
    <form action={importSeason} className="card">
      <div className="field">
        <label>Série ou animé *</label>
        <select
          name="titleId"
          required
          value={titleId}
          onChange={(e) => {
            setTitleId(e.target.value);
            setNumber(nextFor(e.target.value)); // propose automatiquement la saison suivante
          }}
        >
          <option value="" disabled>Choisir une série…</option>
          {series.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.type === "ANIME" ? "(animé)" : ""} — {s.seasons.length ? `saison${s.seasons.length > 1 ? "s" : ""} ${s.seasons.join(", ")}` : "aucune saison"}
            </option>
          ))}
        </select>
      </div>

      {titleId && <SeasonImport number={number} onNumber={setNumber} existing={current?.seasons ?? []} />}

      <button className="btn" style={{ marginTop: "1rem" }} disabled={!titleId}>Ajouter la saison à « {current?.name ?? "…"} »</button>
    </form>
  );
}
