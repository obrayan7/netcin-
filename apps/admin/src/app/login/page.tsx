"use client";

import { useActionState } from "react";
import Logo from "@/components/Logo";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="card login">
      <Logo height={52} />
      <h1>Connexion admin</h1>
      <div className="field">
        <label>Email</label>
        <input name="email" type="email" required autoComplete="username" />
      </div>
      <div className="field">
        <label>Mot de passe</label>
        <input name="password" type="password" required autoComplete="current-password" />
      </div>
      {state?.error && <p className="error">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}
