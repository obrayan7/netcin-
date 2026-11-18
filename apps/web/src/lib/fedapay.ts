// Client minimal pour l'API FedaPay (https://docs.fedapay.com). Aucune dépendance.
// Variables : FEDAPAY_SECRET_KEY (clé secrète sk_sandbox_… / sk_live_…), FEDAPAY_ENV = "sandbox" | "live".

const base = () => (process.env.FEDAPAY_ENV === "live" ? "https://api.fedapay.com/v1" : "https://sandbox-api.fedapay.com/v1");

export const fedapayEnabled = () => !!process.env.FEDAPAY_SECRET_KEY;

/* eslint-disable @typescript-eslint/no-explicit-any */
async function call(path: string, init?: { method?: string; body?: unknown }): Promise<any> {
  const res = await fetch(`${base()}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${process.env.FEDAPAY_SECRET_KEY}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`FedaPay ${res.status}: ${json?.message ?? "erreur"}`);
  return json;
}

// FedaPay enveloppe parfois l'objet ({ "v1/transaction": {...} }) : on accepte les deux formes.
const unwrap = (j: any) => j?.["v1/transaction"] ?? j?.transaction ?? j;

export type CheckoutInput = {
  amount: number;
  currency: string;
  description: string;
  email: string;
  name: string;
  callbackUrl: string;
  paymentId: string;
};

/** Crée la transaction puis son lien de paiement ; renvoie l'id FedaPay et l'URL où envoyer le spectateur. */
export async function createCheckout(i: CheckoutInput): Promise<{ ref: string; url: string }> {
  const [firstname, ...rest] = (i.name || i.email.split("@")[0]).split(" ");
  const tx = unwrap(
    await call("/transactions", {
      method: "POST",
      body: {
        description: i.description,
        amount: i.amount,
        currency: { iso: i.currency },
        callback_url: i.callbackUrl,
        custom_metadata: { paymentId: i.paymentId },
        customer: { email: i.email, firstname, lastname: rest.join(" ") || firstname },
      },
    }),
  );
  const ref = String(tx?.id ?? "");
  if (!ref) throw new Error("FedaPay : transaction sans identifiant");
  const t = await call(`/transactions/${ref}/token`, { method: "POST" });
  const url: string = t?.url ?? (t?.token ? `https://${process.env.FEDAPAY_ENV === "live" ? "" : "sandbox-"}process.fedapay.com/${t.token}` : "");
  if (!url) throw new Error("FedaPay : lien de paiement introuvable");
  return { ref, url };
}

/** Relit la transaction chez FedaPay : seule source de vérité pour valider un paiement. */
export async function fetchTransaction(ref: string): Promise<{ status: string; amount: number; currency: string }> {
  const tx = unwrap(await call(`/transactions/${encodeURIComponent(ref)}`));
  const cur = tx?.currency;
  return {
    status: String(tx?.status ?? ""),
    amount: Number(tx?.amount ?? 0),
    currency: typeof cur === "string" ? cur : String(cur?.iso ?? ""),
  };
}
