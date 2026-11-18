import type { Metadata } from "next";
import { Barlow, Instrument_Sans } from "next/font/google";
import "./globals.css";

// Barlow italique gras : proche des lettres du logo NETCINÉ +
const display = Barlow({ subsets: ["latin"], variable: "--font-display", weight: ["700", "800"], style: ["normal", "italic"] });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "NETCINÉ +",
  description: "NETCINÉ + — films et séries en streaming",
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${display.variable} ${body.variable}`}>
        {children}
        {modal}
      </body>
    </html>
  );
}
