"use client";

import type { Role } from "@/lib/types";

type ConsoleMenuItem<T extends string> = {
  id: T;
  label: string;
  description: string;
};

type ConsoleShellProps<T extends string> = {
  role: Role;
  title: string;
  description: string;
  menu: ConsoleMenuItem<T>[];
  activeMenu: T;
  onMenuChange: (menu: T) => void;
  hideNavigation?: boolean;
  children: React.ReactNode;
};

export function ConsoleShell<T extends string>({
  role,
  title,
  description,
  menu,
  activeMenu,
  onMenuChange,
  hideNavigation = false,
  children
}: ConsoleShellProps<T>) {
  return (
    <div className="space-y-6">
      {!hideNavigation ? (
        <div className="rounded-[2rem] border border-black/5 bg-[var(--card)] px-5 py-4 shadow-[0_18px_60px_rgba(24,39,56,0.08)]">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">{role}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
            </div>

            <nav className="overflow-x-auto">
              <div className="flex min-w-max items-center gap-1">
                {menu.map((item) => {
                  const active = item.id === activeMenu;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onMenuChange(item.id)}
                      className={[
                        "rounded-2xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition",
                        active
                          ? "bg-[var(--foreground)] text-white"
                          : "text-[var(--foreground)] hover:bg-black/5"
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      ) : null}

      {children}
    </div>
  );
}
