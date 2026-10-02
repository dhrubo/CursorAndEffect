"use client";

import { usePathname } from "next/navigation";
import { DemoControls } from "@/components/demo/demo-controls";
import { CoachProvider } from "./coach-provider";
import { NavBar } from "./nav-bar";

const MESH = [/^\/$/, /^\/home/, /^\/coach/, /\/wrapped$/];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mesh = MESH.some((pattern) => pattern.test(pathname));
  return (
    <CoachProvider>
      <div className={`flex min-h-full flex-col ${mesh ? "mesh-screen" : "bg-background text-foreground"}`}>
        <div className="flex-1 pb-28">{children}</div>
        <footer className={`px-4 pb-24 text-[11px] ${mesh ? "text-white/75" : "text-muted-foreground"}`}>
          <p>
            <strong className={mesh ? "text-white" : "text-foreground"}>Guidance, not advice.</strong> Nurture helps
            you think through saving. It is not regulated financial advice. Products and rates are fictional.
          </p>
        </footer>
        <NavBar />
        <DemoControls />
      </div>
    </CoachProvider>
  );
}
