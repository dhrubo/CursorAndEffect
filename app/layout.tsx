import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { PoundSterlingIcon } from "lucide-react";
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
        <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <PoundSterlingIcon className="size-4" />
              </span>
              NextPound
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/#profile" className="hover:text-foreground">
                Your numbers
              </Link>
              <Link href="/plan" className="hover:text-foreground">
                Your plan
              </Link>
            </nav>
          </div>
        </header>
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
      </body>
    </html>
  );
}
