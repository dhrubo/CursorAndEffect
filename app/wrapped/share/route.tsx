import { ImageResponse } from "next/og";

export const runtime = "nodejs";

function clip(value: string | null, fallback: string): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, 90);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = clip(url.searchParams.get("name"), "Your");
  const saved = clip(url.searchParams.get("saved"), "£0");
  const best = clip(url.searchParams.get("best"), "A lighter month");
  const shift = clip(url.searchParams.get("shift"), "Spending held steady");
  const milestones = clip(url.searchParams.get("milestones"), "0");
  const debt = clip(url.searchParams.get("debt"), "£0");
  const next = clip(url.searchParams.get("next"), "Next chapter");
  const goal = clip(url.searchParams.get("goal"), "Your goal");
  const eta = clip(url.searchParams.get("eta"), "date still open");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#5CD719",
          color: "#ffffff",
          padding: "56px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28 }}>
          <div style={{ display: "flex", fontFamily: "Georgia, serif", fontSize: 48 }}>Nuture</div>
          <div style={{ display: "flex", opacity: 0.9 }}>{name}</div>
        </div>
        <div style={{ display: "flex", fontSize: 32 }}>
          {goal} · {eta}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 28, opacity: 0.85 }}>Wrapped</div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1 }}>{saved} in cash</div>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 26 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
            <div style={{ display: "flex", opacity: 0.75 }}>Best month</div>
            <div style={{ display: "flex" }}>{best}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
            <div style={{ display: "flex", opacity: 0.75 }}>Biggest shift</div>
            <div style={{ display: "flex" }}>{shift}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26 }}>
          <div style={{ display: "flex" }}>{milestones} milestones</div>
          <div style={{ display: "flex" }}>{debt} debt</div>
          <div style={{ display: "flex" }}>{next}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
