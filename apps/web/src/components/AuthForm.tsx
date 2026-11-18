"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginViewer, registerViewer } from "@/app/actions";

export default function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const [state, action, pending] = useActionState(mode === "login" ? loginViewer : registerViewer, undefined);
  const q = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form action={action} className="auth-card">
      <h1>{mode === "login" ? "Connexion" : "Créer un compte"}</h1>
      <input type="hidden" name="next" value={next} />
      {mode === "register" && (
        <div className="field">
          <label htmlFor="name">Prénom ou pseudo</label>
          <input id="name" name="name" autoComplete="nickname" maxLength={60} />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Mot de passe{mode === "register" ? " (8 caractères minimum)" : ""}</label>
        <input id="password" name="password" type="password" required minLength={mode === "register" ? 8 : undefined} autoComplete={mode === "login" ? "current-password" : "new-password"} />
      </div>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn" style={{ width: "100%" }} disabled={pending}>
        {pending ? "Patientez…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
      </button>
      <p className="meta" style={{ marginTop: "1rem" }}>
        {mode === "login" ? (
          <>Nouveau sur NETCINÉ + ? <Link href={`/register${q}`}>Créer un compte</Link></>
        ) : (
          <>Déjà inscrit ? <Link href={`/login${q}`}>Se connecter</Link></>
        )}
      </p>
    </form>
  );
}
