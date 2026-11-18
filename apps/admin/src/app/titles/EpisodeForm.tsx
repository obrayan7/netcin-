import type { Episode } from "@netcine/db";
import UploadField from "@/components/UploadField";
import { saveEpisode } from "../actions";

type Props = { titleId: string; seasonId: string; episode?: Episode; nextNumber?: number };

export default function EpisodeForm({ titleId, seasonId, episode, nextNumber }: Props) {
  return (
    <form action={saveEpisode} className="episode-form">
      <input type="hidden" name="id" defaultValue={episode?.id ?? ""} />
      <input type="hidden" name="titleId" defaultValue={titleId} />
      <input type="hidden" name="seasonId" defaultValue={seasonId} />

      <div className="grid3">
        <div className="field"><label>N° *</label><input name="number" type="number" min={1} required defaultValue={episode?.number ?? nextNumber} /></div>
        <div className="field"><label>Titre *</label><input name="name" required defaultValue={episode?.name} /></div>
        <div className="field"><label>Durée (min)</label><input name="durationMin" type="number" defaultValue={episode?.durationMin ?? ""} /></div>
      </div>
      <div className="field"><label>Résumé</label><textarea name="synopsis" rows={2} defaultValue={episode?.synopsis} /></div>
      <UploadField name="thumbUrl" label="Miniature" accept="image/*" folder="thumbs" defaultValue={episode?.thumbUrl} />
      <UploadField name="videoUrl" label="Vidéo de l'épisode (MP4 ou .m3u8)" accept="video/*,.m3u8" folder="videos" defaultValue={episode?.videoUrl} />
      <button className="btn">{episode ? "Enregistrer l'épisode" : "Ajouter l'épisode"}</button>
    </form>
  );
}
