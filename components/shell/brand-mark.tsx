export function BrandStar({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 1.5 13.8 10.2 22.5 12 13.8 13.8 12 22.5 10.2 13.8 1.5 12 10.2 10.2Z"
        fill="currentColor"
      />
    </svg>
  );
}
