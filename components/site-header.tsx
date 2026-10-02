"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HouseIcon, TargetIcon } from "lucide-react";
import { AssistantDock, CoachTrigger } from "@/components/chat/assistant-dock";
import { useAssistant } from "@/components/chat/assistant-provider";
import { cn } from "cn";

export function SiteHeader() {
  const pathname = usePathname();
  const { open } = useAssistant();
  const goalsActive = pathname.startsWith("/plan");
  const homeActive = pathname === "/";

  return (
    <>
      <header className="sticky top-0 z-20 bg-nuture-paper">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4">
          <Link href="/" className="font-serif text-2xl leading-none text-nuture-ink">
            Nurture
          </Link>
          <nav className="hidden items-center gap-5 sm:flex" aria-label="Primary">
            <HeaderLink href="/plan#goals" active={goalsActive}>
              Goals
            </HeaderLink>
            <HeaderLink href="/" active={homeActive}>
              Home
            </HeaderLink>
            <CoachTrigger appearance="pill" />
          </nav>
        </div>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex h-20 items-stretch justify-around bg-white sm:hidden"
        aria-label="Primary"
      >
        <BottomLink href="/plan#goals" label="Goals" active={goalsActive && !open}>
          <TargetIcon className="size-6" strokeWidth={1.75} />
        </BottomLink>
        <BottomLink href="/" label="Home" active={homeActive && !open}>
          <HouseIcon className="size-6" strokeWidth={1.75} />
        </BottomLink>
        <CoachTrigger appearance="tab" />
      </nav>
      <AssistantDock />
    </>
  );
}

function HeaderLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center text-[15px]",
        active ? "text-nuture-ink" : "text-[#8a8680]",
      )}
    >
      {children}
    </Link>
  );
}

function BottomLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 min-w-16 flex-1 flex-col items-center justify-center gap-1 text-[13px]",
        active ? "text-nuture-ink" : "text-[#8a8680]",
      )}
    >
      {children}
      {label}
    </Link>
  );
}
