import { cn } from "cn";

export function FourPointStar({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex items-center justify-center leading-none", className)}>
      ✦
    </span>
  );
}
