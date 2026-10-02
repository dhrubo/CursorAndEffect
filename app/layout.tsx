import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AssistantProvider } from "@/components/chat/assistant-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NextPound | What should I do with my next £?",
  description:
    "UK money guidance across debt, savings, ISAs, current accounts and mortgages, in one plan. Guidance, not regulated financial advice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-muted/40">
        <AssistantProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
        <footer className="border-t bg-background">
          <div className="mx-auto grid w-full max-w-7xl gap-2 px-4 py-6 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">Guidance, not advice.</strong> NextPound gives general
              information to help you think through money decisions. It is not regulated financial advice and
              doesn&apos;t know your full circumstances. Products and rates shown are fictional and illustrative.
              Tax rules shown are for England, Wales and Northern Ireland.
            </p>
            <p>
              Struggling with debt? Get free, impartial help from{" "}
              <a className="underline" href="https://www.moneyhelper.org.uk" target="_blank" rel="noreferrer">
                MoneyHelper
              </a>
              ,{" "}
              <a className="underline" href="https://www.stepchange.org" target="_blank" rel="noreferrer">
                StepChange
              </a>{" "}
              or{" "}
              <a className="underline" href="https://nationaldebtline.org" target="_blank" rel="noreferrer">
                National Debtline
              </a>
              . Your numbers are stored only in this browser.
            </p>
          </div>
        </footer>
        </AssistantProvider>
      </body>
    </html>
  );
}
