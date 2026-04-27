"use client";

import { ROLES } from "@/lib/constants";
import type { Role } from "@/lib/types";

type RoleSwitcherProps = {
  value: Role;
  onChange: (role: Role) => void;
};

export function RoleSwitcher({ value, onChange }: RoleSwitcherProps) {
  return (
    <div className="inline-flex rounded-2xl border border-black/10 bg-white/80 p-1 shadow-sm backdrop-blur">
      {ROLES.map((role) => {
        const active = role === value;

        return (
          <button
            key={role}
            type="button"
            onClick={() => onChange(role)}
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--foreground)]"
            ].join(" ")}
          >
            {role}
          </button>
        );
      })}
    </div>
  );
}
