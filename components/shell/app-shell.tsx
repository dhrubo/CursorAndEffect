"use client";

import { usePathname, useRouter } from "next/navigation";
import { PushNotifier } from "@/components/coach/push-notifier";
import { useSaver } from "@/lib/saver/use-saver-state";
import { CoachProvider } from "./coach-provider";
import { NavBar } from "./nav-bar";

const MESH = [/^\/$/, /^\/home$/, /\/wrapped$/];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { clear } = useSaver();
  const mesh = MESH.some((pattern) => pattern.test(pathname));
  const homeVisible = pathname !== "/";
  const coach = pathname.startsWith("/coach");
  return (
    <CoachProvider>
      <div className={`flex min-h-[100dvh] flex-col ${coach ? "mesh-screen !text-[#1a1a1a]" : mesh ? "mesh-screen" : "bg-background text-foreground"}`}>
        <button
          type="button"
          className="fixed top-3 right-3 z-50 rounded-full bg-[#1a1a1a] px-3 py-1 text-[13px] text-white"
          onClick={() => {
            clear();
            router.push("/");
          }}
        >
          Start again
        </button>
        <div className="flex-1 pb-28">{children}</div>
        {homeVisible && <NavBar />}
        <PushNotifier active={homeVisible} />
      </div>
    </CoachProvider>
  );
}
