export function Wordmark({
  variant,
  className = "",
}: {
  variant: "white" | "gradient";
  className?: string;
}) {
  const white = variant === "white";
  return (
    <span
      className={`font-display text-[2rem] leading-none ${white ? "text-white" : "wordmark-gradient"} ${className}`}
    >
      Nurture
    </span>
  );
}
