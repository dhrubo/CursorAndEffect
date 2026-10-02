"use client";

import { usePathname } from "next/navigation";
import { AssistantProvider } from "@/components/chat/assistant-provider";
import { SiteHeader } from "@/components/site-header";
import { AppShell } from "./app-shell";

const LEGACY = [/^\/plan(?:\/|$)/, /^\/wrapped(?:\/|$)/];

export function RootChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const legacy = LEGACY.some((pattern) => pattern.test(pathname));

  return (
    <AssistantProvider>
      {legacy ? (
        <div className="flex min-h-full flex-col bg-background pb-20 text-foreground sm:pb-0">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t bg-background">
            <div className="mx-auto grid w-full max-w-7xl gap-2 px-4 py-6 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">Guidance, not advice.</strong> Nurture gives general
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
                . If you are thinking about self-harm, contact Samaritans on 116 123 (free, 24/7). Your numbers
                are stored only in this browser.
              </p>
            </div>
          </footer>
        </div>
      ) : (
        <AppShell>{children}</AppShell>
      )}
    </AssistantProvider>
  );
}
