import type { Metadata } from "next";
import { DM_Sans, Inknut_Antiqua } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-sans",
});

const display = Inknut_Antiqua({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Nurture | See your plans come together",
  description:
    "A warm savings coach. Set a plan, watch it come together, and choose what a spend does to the date. Guidance, not regulated financial advice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${sans.variable} ${display.variable} ${sans.className} h-full antialiased`}>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
