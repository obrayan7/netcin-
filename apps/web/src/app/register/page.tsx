import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import Logo from "@/components/Logo";
import { getViewerId, safeNext } from "@/lib/session";

export const metadata = { title: "Créer un compte · NETCINÉ +" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getViewerId()) redirect(next);
  return (
    <main className="auth">
      <div>
        <div className="auth-logo"><Logo height={60} /></div>
        <AuthForm mode="register" next={next} />
      </div>
    </main>
  );
}
