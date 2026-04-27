type SectionCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function SectionCard({
  title,
  description,
  children,
  action
}: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-black/5 bg-[var(--card)] p-6 shadow-[0_18px_60px_rgba(24,39,56,0.08)] backdrop-blur">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">
            {title}
          </h2>
          {description ? (
            <p className="text-sm leading-6 text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
