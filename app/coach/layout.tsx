import type { Metadata } from "next";
import { DM_Sans, Inknut_Antiqua } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
});

const inknut = Inknut_Antiqua({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inknut",
});

export const metadata: Metadata = {
  title: "Coach | Nuture",
  description:
    "A proactive spending coach that notices extra spend and shows where leftover money can go. Guidance, not regulated financial advice.",
};

export default function CoachLayout({ children }: LayoutProps<"/coach">) {
  return (
    <div className={`${dmSans.variable} ${inknut.variable} min-h-full bg-[#F7F5F2] font-[family-name:var(--font-dm)]`}>
      {children}
    </div>
  );
}
