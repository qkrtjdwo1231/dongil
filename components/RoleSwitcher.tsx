"use client";

import { useEffect, useRef, useState } from "react";
import { ROLES } from "@/lib/constants";
import type { Role } from "@/lib/types";

type RoleSwitcherProps = {
  value: Role;
  onChange: (role: Role) => void;
};

export function RoleSwitcher({ value, onChange }: RoleSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm backdrop-blur"
      >
        <span>{value}</span>
        <span className="text-xs text-[var(--muted)]">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] min-w-36 rounded-2xl border border-black/10 bg-white/95 p-2 shadow-[0_18px_40px_rgba(24,39,56,0.14)] backdrop-blur">
          {ROLES.map((role) => {
            const active = role === value;

            return (
              <button
                key={role}
                type="button"
                onClick={() => {
                  onChange(role);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "bg-[var(--secondary)] font-semibold text-[var(--primary)]"
                    : "text-[var(--foreground)] hover:bg-black/5"
                ].join(" ")}
              >
                <span>{role}</span>
                {active ? <span className="text-xs">선택됨</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
