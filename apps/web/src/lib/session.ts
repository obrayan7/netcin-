import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "netcine_session";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET manquant ou trop court");
  return new TextEncoder().encode(s);
}

export async function createViewerSession(viewerId: string) {
  const token = await new SignJWT({ sub: viewerId })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("viewer")
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroyViewerSession() {
  (await cookies()).delete(COOKIE);
}

/** Id du spectateur connecté, ou null. Ne lève jamais d'erreur (le site reste visible sans session). */
export async function getViewerId(): Promise<string | null> {
  try {
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret(), { audience: "viewer" });
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

/** N'autorise que les chemins internes (évite les redirections vers un autre site). */
export function safeNext(value: unknown): string {
  const n = typeof value === "string" ? value : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}
