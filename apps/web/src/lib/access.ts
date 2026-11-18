import { freeEpisodeCount, getSettings, hasActiveSubscription, type Settings } from "@netcine/db";

export type Flat = { id: string }[];

export type Gate = {
  settings: Settings;
  subscribed: boolean;
  /** Épisodes gratuits (série) = ceil(total × % / 100). */
  freeCount: number;
  total: number;
  /** Identifiants d'épisodes verrouillés pour ce spectateur. */
  lockedIds: Set<string>;
  /** Le film est verrouillé pour ce spectateur. */
  movieLocked: boolean;
};

/**
 * Règle d'accès. `episodes` doit être trié (saison puis numéro) : les N premiers sont gratuits.
 * Mode payant désactivé, ou abonnement actif : rien n'est verrouillé.
 */
export async function getGate(viewerId: string | null, episodes: Flat): Promise<Gate> {
  const settings = await getSettings();
  const subscribed = await hasActiveSubscription(viewerId);
  const total = episodes.length;
  const freeCount = freeEpisodeCount(total, settings.freePercent);
  const enforce = settings.paidMode && !subscribed;
  const lockedIds = new Set(enforce ? episodes.slice(freeCount).map((e) => e.id) : []);
  return { settings, subscribed, freeCount, total, lockedIds, movieLocked: enforce && settings.lockMovies };
}
