"use client";

type QuantityInputProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
};

export function QuantityInput({
  value,
  onChange,
  min = 0
}: QuantityInputProps) {
  const updateValue = (nextValue: number) => {
    onChange(Math.max(min, nextValue));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => updateValue(value - 1)}
          className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
        >
          -
        </button>
        <input
          type="number"
          min={min}
          value={value}
          onChange={(event) => updateValue(Number(event.target.value))}
          className="w-28 rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-2 text-center text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => updateValue(value + 1)}
          className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 5, 10].map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => updateValue(value + amount)}
            className="rounded-2xl bg-[var(--secondary)] px-3 py-2 text-sm font-semibold text-[var(--primary)]"
          >
            +{amount}
          </button>
        ))}
      </div>
    </div>
  );
}
