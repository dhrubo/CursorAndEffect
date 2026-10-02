"use client";

import { usePathname, useRouter } from "next/navigation";
import { DemoControls } from "@/components/demo/demo-controls";
import { useSaver } from "@/lib/saver/use-saver-state";
import { CoachProvider } from "./coach-provider";
import { NavBar } from "./nav-bar";

const MESH = [/^\/$/, /\/wrapped$/];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { clear } = useSaver();
  const mesh = MESH.some((pattern) => pattern.test(pathname));
  return (
    <CoachProvider>
      <div className={`flex min-h-full flex-col ${mesh ? "mesh-screen" : "bg-background text-foreground"}`}>
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
        <footer className={`px-4 pb-24 text-[11px] ${mesh && pathname !== "/" ? "text-white/75" : "text-[#1a1a1a]/70"}`}>
          <p>
            <strong className={mesh && pathname !== "/" ? "text-white" : "text-[#1a1a1a]"}>Guidance, not advice.</strong> Nurture helps
            you think through saving. It is not regulated financial advice. Products and rates are fictional.
          </p>
        </footer>
        {pathname !== "/" && <NavBar />}
        <DemoControls />
      </div>
    </CoachProvider>
  );
}
