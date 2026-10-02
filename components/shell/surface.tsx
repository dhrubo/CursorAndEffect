export function MeshBand({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="bg-[url('/brand/image-mesh-gradient.jpg')] bg-cover bg-center px-4 pt-6 pb-14 text-[#1a1a1a]">
      <p className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/30 px-3 py-1 text-[14px] backdrop-blur-md">
        <span aria-hidden="true">✦</span> {label}
      </p>
      {children ? <div className="mt-4 grid gap-3">{children}</div> : null}
    </section>
  );
}

export function WhiteSheet({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative z-10 -mt-8 min-h-[46vh] rounded-t-[28px] bg-white px-4 pt-6 pb-10 text-[#1a1a1a] ${className}`}>
      {children}
    </section>
  );
}

export function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[22px] border border-white/75 bg-white/30 px-4 py-4 text-[#1a1a1a] backdrop-blur-md ${className}`}>
      {children}
    </div>
  );
}
