"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toggleLike, toggleMyList } from "@/app/actions";

type Props = {
  titleId: string;
  active: boolean;
  loggedIn: boolean;
  /** « icon » : petit bouton rond des cartes. « pill » : bouton avec texte (fiche). */
  variant?: "icon" | "pill";
};

function useToggle(action: (id: string) => Promise<{ needAuth?: boolean; value?: boolean }>, { titleId, active, loggedIn }: Props) {
  const router = useRouter();
  const path = usePathname();
  const [on, setOn] = useState(active);
  const [pending, start] = useTransition();
  useEffect(() => setOn(active), [active]);

  const goLogin = () => router.push(`/login?next=${encodeURIComponent(path)}`);
  const click = () => {
    if (!loggedIn) return goLogin();
    const before = on;
    setOn(!before);
    start(async () => {
      const r = await action(titleId);
      if (r.needAuth) {
        setOn(before);
        goLogin();
      } else if (typeof r.value === "boolean") setOn(r.value);
    });
  };
  return { on, pending, click };
}

export function ListButton(props: Props) {
  const { on, pending, click } = useToggle(toggleMyList, props);
  const label = on ? "Retirer de ma liste" : "Ajouter à ma liste";
  if (props.variant === "pill") {
    return (
      <button type="button" className={on ? "pill on" : "pill"} onClick={click} disabled={pending} aria-pressed={on}>
        {on ? "✓ Dans ma liste" : "+ Ma liste"}
      </button>
    );
  }
  return (
    <button type="button" className={on ? "rb on" : "rb"} onClick={click} disabled={pending} aria-pressed={on} aria-label={label} title={label}>
      {on ? "✓" : "+"}
    </button>
  );
}

export function LikeButton(props: Props) {
  const { on, pending, click } = useToggle(toggleLike, props);
  const label = on ? "Retirer mon j'aime" : "J'aime";
  if (props.variant === "pill") {
    return (
      <button type="button" className={on ? "pill on" : "pill"} onClick={click} disabled={pending} aria-pressed={on}>
        👍 J'aime
      </button>
    );
  }
  return (
    <button type="button" className={on ? "rb on" : "rb"} onClick={click} disabled={pending} aria-pressed={on} aria-label={label} title={label}>
      👍
    </button>
  );
}
