import { SectionCard } from "@/components/SectionCard";

type PlaceholderPanelProps = {
  title: string;
  message: string;
};

export function PlaceholderPanel({ title, message }: PlaceholderPanelProps) {
  return (
    <SectionCard title={title} description="현재 MVP 범위에서는 안내 화면만 제공합니다.">
      <div className="rounded-2xl border border-dashed border-black/10 bg-white/70 px-5 py-10 text-center">
        <p className="text-base leading-7 text-[var(--muted)]">{message}</p>
      </div>
    </SectionCard>
  );
}
