"use client";

import Link from "next/link";
import { PoundSterlingIcon } from "lucide-react";
import { AssistantDock } from "@/components/chat/assistant-dock";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <PoundSterlingIcon className="size-4" />
          </span>
          NextPound
        </Link>
        <nav className="flex items-center gap-3 text-sm text-muted-foreground sm:gap-4">
          <Link href="/#profile" className="hidden hover:text-foreground sm:inline">
            Your numbers
          </Link>
          <Link href="/plan" className="hover:text-foreground">
            Your plan
          </Link>
          <Link href="/wrapped" className="hover:text-foreground">
            Wrapped
          </Link>
          <AssistantDock />
        </nav>
      </div>
    </header>
  );
}
