import type { Category, Title } from "@netcine/db";
import UploadField from "@/components/UploadField";
import { saveTitle } from "../actions";

type Props = { title?: Title & { categories: Category[] }; categories: Category[] };

export default function TitleForm({ title, categories }: Props) {
  const selected = new Set(title?.categories.map((c) => c.id));
  return (
    <form action={saveTitle} className="card">
      <input type="hidden" name="id" defaultValue={title?.id ?? ""} />

      <div className="grid2">
        <div className="field">
          <label>Type</label>
          <select name="type" defaultValue={title?.type ?? "MOVIE"}>
            <option value="MOVIE">Film</option>
            <option value="SERIES">Série</option>
          </select>
        </div>
        <div className="field">
          <label>Nom *</label>
          <input name="name" required defaultValue={title?.name} />
        </div>
      </div>

      <div className="field">
        <label>Synopsis</label>
        <textarea name="synopsis" rows={4} defaultValue={title?.synopsis} />
      </div>

      <div className="grid3">
        <div className="field"><label>Année</label><input name="year" type="number" defaultValue={title?.year ?? ""} /></div>
        <div className="field"><label>Classification (ex : 12+)</label><input name="ageRating" defaultValue={title?.ageRating} /></div>
        <div className="field"><label>Durée (min, films)</label><input name="durationMin" type="number" defaultValue={title?.durationMin ?? ""} /></div>
      </div>

      <div className="grid2">
        <div className="field"><label>Distribution (acteurs, séparés par des virgules)</label><input name="cast" defaultValue={title?.cast} /></div>
        <div className="field"><label>Genres (ex : Drame, Thriller)</label><input name="genres" defaultValue={title?.genres} /></div>
      </div>
      <div className="grid3">
        <div className="field"><label>Ce titre est… (ex : Suspense, Sombre)</label><input name="mood" defaultValue={title?.mood} /></div>
        <div className="field"><label>Langues audio (ex : Français, Anglais)</label><input name="languages" defaultValue={title?.languages} /></div>
        <div className="field"><label>Place dans le Top 10 (1 à 10, vide = non classé)</label><input name="top10Rank" type="number" min={1} max={10} defaultValue={title?.top10Rank ?? ""} /></div>
      </div>

      <UploadField name="posterUrl" label="Affiche (portrait/miniature)" accept="image/*" folder="posters" defaultValue={title?.posterUrl} />
      <UploadField name="backdropUrl" label="Image de fond (bannière)" accept="image/*" folder="backdrops" defaultValue={title?.backdropUrl} />
      <UploadField name="videoUrl" label="Vidéo du film (MP4 ou .m3u8) — laisser vide pour une série" accept="video/*,.m3u8" folder="videos" defaultValue={title?.videoUrl} />

      <div className="field">
        <label>Rangées de l'accueil</label>
        <div className="checks">
          {categories.map((c) => (
            <label key={c.id}><input type="checkbox" name="categoryIds" value={c.id} defaultChecked={selected.has(c.id)} /> {c.name}</label>
          ))}
          {categories.length === 0 && <em>Créez d'abord des catégories.</em>}
        </div>
      </div>

      <div className="checks">
        <label><input type="checkbox" name="published" defaultChecked={title?.published ?? true} /> Publié</label>
        <label><input type="checkbox" name="featured" defaultChecked={title?.featured ?? false} /> À la une (bannière d'accueil)</label>
      </div>

      <button className="btn">{title ? "Enregistrer" : "Créer"}</button>
    </form>
  );
}
