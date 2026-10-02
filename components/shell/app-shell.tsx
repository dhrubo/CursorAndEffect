"use client";

import { usePathname } from "next/navigation";
import { PushNotifier } from "@/components/coach/push-notifier";
import { DemoControls } from "@/components/demo/demo-controls";
import { CoachProvider } from "./coach-provider";
import { NavBar } from "./nav-bar";

const MESH = [/^\/$/, /^\/coach/, /\/wrapped$/];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mesh = MESH.some((pattern) => pattern.test(pathname));
  const homeVisible = pathname !== "/";
  return (
    <CoachProvider>
      <div className={`flex min-h-full flex-col ${mesh ? "mesh-screen" : "bg-background text-foreground"}`}>
        <div className="flex-1 pb-28">{children}</div>
        <footer className={`px-4 pb-24 text-[11px] ${mesh && homeVisible ? "text-white/75" : "text-[#1a1a1a]/70"}`}>
          <p>
            <strong className={mesh && homeVisible ? "text-white" : "text-[#1a1a1a]"}>Guidance, not advice.</strong> Nurture helps
            you think through saving. It is not regulated financial advice. Products and rates are fictional.
          </p>
        </footer>
        {homeVisible && <NavBar />}
        <DemoControls />
        <PushNotifier active={homeVisible} />
      </div>
    </CoachProvider>
  );
}
