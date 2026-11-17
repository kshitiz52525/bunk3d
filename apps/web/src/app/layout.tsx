import type { Metadata } from "next";
import { Inter, Unbounded } from "next/font/google";
import "@bunk3d/ui/tokens.css";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const unbounded = Unbounded({ subsets: ["latin"], weight: "800", variable: "--font-unbounded" });

export const metadata: Metadata = {
  title: "Bunk3d",
  description: "College happens outside class.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${unbounded.variable}`}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
