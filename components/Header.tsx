import { RoleSwitcher } from "@/components/RoleSwitcher";
import type { Role } from "@/lib/types";

type HeaderProps = {
  role: Role;
  onRoleChange: (role: Role) => void;
};

export function Header({ role, onRoleChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
            Dongil Glass
          </p>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-[var(--foreground)]">
            동일유리 작업관리
          </h1>
        </div>
        <RoleSwitcher value={role} onChange={onRoleChange} />
      </div>
    </header>
  );
}
