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
    <nav className="fixed inset-x-0 bottom-0 z-30 h-20 border-0 bg-white">
      <ul className="mx-auto flex h-full max-w-md items-center justify-around">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 text-[13px] ${active ? "text-[#1a1a1a]" : "text-[#8a8680]"}`}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
