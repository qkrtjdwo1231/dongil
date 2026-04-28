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
  searchPlaceholder: string;
  menu: ConsoleMenuItem<T>[];
  activeMenu: T;
  onMenuChange: (menu: T) => void;
  search: string;
  onSearchChange: (value: string) => void;
  children: React.ReactNode;
};

export function ConsoleShell<T extends string>({
  role,
  title,
  description,
  searchPlaceholder,
  menu,
  activeMenu,
  onMenuChange,
  search,
  onSearchChange,
  children
}: ConsoleShellProps<T>) {
  return (
    <div className="grid gap-6 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="rounded-[2rem] border border-black/5 bg-[var(--card)] p-4 shadow-[0_18px_60px_rgba(24,39,56,0.08)]">
        <div className="rounded-[1.5rem] bg-[var(--secondary)] px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">{role}</p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--foreground)]">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>

        <nav className="mt-5 space-y-1">
          {menu.map((item) => {
            const active = item.id === activeMenu;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onMenuChange(item.id)}
                className={[
                  "w-full rounded-2xl px-4 py-3 text-left transition",
                  active ? "bg-[var(--foreground)] text-white" : "hover:bg-black/5"
                ].join(" ")}
              >
                <div className="text-sm font-semibold">{item.label}</div>
                <div className={active ? "mt-1 text-xs text-white/75" : "mt-1 text-xs text-[var(--muted)]"}>
                  {item.description}
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="space-y-6">
        <div className="rounded-[2rem] border border-black/5 bg-[var(--card)] px-5 py-4 shadow-[0_18px_60px_rgba(24,39,56,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
            </div>
            <div className="min-w-[18rem] flex-1 lg:max-w-md">
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>
        </div>

        {children}
      </section>
    </div>
  );
}
