import { RoleSwitcher } from "@/components/RoleSwitcher";
import type { Role } from "@/lib/types";

type HeaderProps = {
  role: Role;
  onRoleChange: (role: Role) => void;
  navigation?: React.ReactNode;
  searchSlot?: React.ReactNode;
};

export function Header({ role, onRoleChange, navigation, searchSlot }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 py-5">
        <div className="flex items-center gap-5">
          <div className="shrink-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
              Dongil Glass
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[var(--foreground)] xl:text-2xl">
              동일유리 작업관리
            </h1>
          </div>

          <div className="min-w-0 flex-1">{navigation}</div>

          {searchSlot ? <div className="hidden shrink-0 lg:block">{searchSlot}</div> : null}

          <div className="shrink-0">
            <RoleSwitcher value={role} onChange={onRoleChange} />
          </div>
        </div>
      </div>
    </header>
  );
}
