"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HouseIcon, TargetIcon } from "lucide-react";
import { BrandStar } from "./brand-mark";

const ITEMS = [
  { href: "/goals", label: "Goals", icon: TargetIcon },
  { href: "/home", label: "Home", icon: HouseIcon },
  { href: "/coach", label: "Coach", icon: BrandStar },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-5">
      <ul className="liquid-glass flex w-full max-w-md items-center justify-around rounded-full px-4 py-3">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 text-[13px] ${active ? "font-medium text-[#1a1a1a]" : "text-[#7a776f]"}`}
              >
                <Icon className="size-5" fill={active && item.href === "/home" ? "currentColor" : "none"} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
