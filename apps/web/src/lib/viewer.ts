import { cache } from "react";
import { db } from "@netcine/db";
import { getViewerId } from "./session";

export type ViewerCtx = {
  loggedIn: boolean;
  id: string | null;
  list: Set<string>;
  likes: Set<string>;
};

/** État du spectateur (ma liste, j'aime), calculé une seule fois par requête. */
export const getViewerCtx = cache(async (): Promise<ViewerCtx> => {
  const id = await getViewerId();
  if (!id) return { loggedIn: false, id: null, list: new Set(), likes: new Set() };
  const [list, likes] = await Promise.all([
    db.myListItem.findMany({ where: { viewerId: id }, select: { titleId: true } }),
    db.like.findMany({ where: { viewerId: id }, select: { titleId: true } }),
  ]);
  return {
    loggedIn: true,
    id,
    list: new Set(list.map((x) => x.titleId)),
    likes: new Set(likes.map((x) => x.titleId)),
  };
});
