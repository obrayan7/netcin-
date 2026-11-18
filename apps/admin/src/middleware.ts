import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Première barrière : tout est protégé sauf /login. Chaque page, action et route
// revérifie aussi la session (requireAdmin / getSession) : défense en profondeur.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname.startsWith("/api/")) return NextResponse.next();

  const token = req.cookies.get("admin_session")?.value;
  if (token && process.env.AUTH_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      return NextResponse.next();
    } catch {
      /* session invalide */
    }
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|logo.png).*)"],
};
