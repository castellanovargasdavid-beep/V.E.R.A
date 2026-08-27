import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "V.E.R.A — Copiloto de diseño web e IA",
  description:
    "Copiloto estilo J.A.R.V.I.S. para diseño web y redes sociales, orientado a PYMEs y creadores.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
