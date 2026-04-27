type RecentOrderButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
};

export function RecentOrderButton({
  onClick,
  disabled = false
}: RecentOrderButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--secondary)] px-4 py-2 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      직전 주문 불러오기
    </button>
  );
}
