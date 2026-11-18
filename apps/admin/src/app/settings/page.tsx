import { freeEpisodeCount, formatPrice, getSettings } from "@netcine/db";
import { requireAdmin } from "@/lib/auth";
import { saveSettings } from "../actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const q = await searchParams;
  const s = await getSettings();

  return (
    <>
      <h1>Abonnement</h1>
      <p className={s.paidMode ? "ok" : "meta"}>
        {s.paidMode
          ? `Mode payant ACTIVÉ — ${formatPrice(s.priceAmount, s.currency)} pour ${s.periodDays} jours.`
          : "Mode payant désactivé — tout le site est gratuit."}
      </p>
      {q.saved && <p className="ok">Réglages enregistrés. Ils s'appliquent immédiatement sur le site.</p>}
      {q.error && <p className="error">Le prix doit être un nombre positif.</p>}

      <form action={saveSettings} className="card">
        <div className="field">
          <label className="check">
            <input type="checkbox" name="paidMode" defaultChecked={s.paidMode} /> Activer le mode payant
          </label>
          <p className="meta">
            Désactivé : tout est gratuit, aucun message d'abonnement. Activé : seule la part gratuite des séries reste
            visible sans abonnement.
          </p>
        </div>

        <div className="grid3">
          <div className="field">
            <label>Prix de l'abonnement</label>
            <input name="priceAmount" type="number" min={0} step={5} required defaultValue={s.priceAmount} />
          </div>
          <div className="field">
            <label>Devise</label>
            <select name="currency" defaultValue={s.currency}>
              <option value="XOF">F CFA (XOF)</option>
              <option value="XAF">F CFA (XAF)</option>
              <option value="USD">Dollar (USD)</option>
            </select>
          </div>
          <div className="field">
            <label>Durée d'un abonnement (jours)</label>
            <input name="periodDays" type="number" min={1} required defaultValue={s.periodDays} />
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <label>Part gratuite d'une série (%)</label>
            <input name="freePercent" type="number" min={0} max={100} required defaultValue={s.freePercent} />
            <p className="meta">
              Exemple avec 24 épisodes : {freeEpisodeCount(24, s.freePercent)} gratuits, le reste après abonnement.
              Les épisodes sont comptés dans l'ordre (saison 1, saison 2…), toutes saisons confondues.
            </p>
          </div>
          <div className="field">
            <label className="check">
              <input type="checkbox" name="lockMovies" defaultChecked={s.lockMovies} /> Les films exigent aussi l'abonnement
            </label>
            <p className="meta">Décoché : les films restent gratuits, seules les séries sont limitées.</p>
          </div>
        </div>

        <div className="field">
          <label>Instructions de paiement manuel (optionnel)</label>
          <textarea
            name="manualInstructions"
            rows={4}
            placeholder="Ex : Envoyez 750 F par Wave au 77 000 00 00 puis indiquez le numéro de transaction."
            defaultValue={s.manualInstructions}
          />
          <p className="meta">
            Affiché aux spectateurs si le paiement en ligne n'est pas configuré. Vous validez ensuite chaque paiement dans
            « Paiements ».
          </p>
        </div>

        <button className="btn">Enregistrer</button>
      </form>
    </>
  );
}
