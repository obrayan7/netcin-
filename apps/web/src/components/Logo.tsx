import Link from "next/link";

export default function Logo({ href = "/", height = 50 }: { href?: string; height?: number }) {
  return (
    <Link href={href} className="brand" aria-label="NETCINÉ +, accueil">
      <img src="/logo.png" alt="NETCINÉ +" style={{ height }} />
    </Link>
  );
}
