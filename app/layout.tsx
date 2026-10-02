import type { Metadata } from "next";
import { DM_Sans, Inknut_Antiqua } from "next/font/google";
import { RootChrome } from "@/components/shell/root-chrome";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inknut = Inknut_Antiqua({
  variable: "--font-inknut",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nurture | See your plans come together",
  description:
    "A warm savings coach. Set a plan, watch it come together, and choose what a spend does to the date. Guidance, not regulated financial advice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${dmSans.variable} ${inknut.variable} h-full antialiased`}>
      <body className="min-h-full">
        <RootChrome>{children}</RootChrome>
      </body>
    </html>
  );
}
