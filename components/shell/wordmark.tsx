import Image from "next/image";

export function Wordmark({
  variant,
  className = "",
}: {
  variant: "white" | "gradient";
  className?: string;
}) {
  const white = variant === "white";
  return (
    <Image
      src={white ? "/brand/nuture-wordmark-white.png" : "/brand/nuture-wordmark-gradient.png"}
      alt="Nuture"
      width={white ? 209 : 216}
      height={white ? 48 : 57}
      className={`${white ? "wordmark-knockout " : ""}h-9 w-auto ${className}`}
    />
  );
}
