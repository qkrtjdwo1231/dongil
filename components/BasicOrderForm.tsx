import { RecentOrderButton } from "@/components/RecentOrderButton";
import { SectionCard } from "@/components/SectionCard";

export function BasicOrderForm() {
  return (
    <SectionCard
      title="기본 등록"
      description="빠른 문장 입력과 3단계 등록 폼을 결합한 직원용 주문 등록 화면입니다."
      action={<RecentOrderButton disabled />}
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-dashed border-[var(--primary)]/20 bg-[var(--secondary)]/70 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[var(--foreground)]">
                기존 데이터 업로드
              </h3>
              <p className="text-sm leading-6 text-[var(--muted)]">
                기존 엑셀 파일을 이관할 수 있는 공간입니다. 현재는 업로드 자리만 먼저 제공하고,
                실제 파싱 및 등록 연결은 추후 작업으로 이어집니다.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center rounded-2xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-white">
              파일 선택
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" />
            </label>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.2fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">빠른 문장 입력</h3>
              <button
                type="button"
                className="rounded-xl bg-[var(--foreground)] px-3 py-2 text-xs font-semibold text-white"
              >
                자동 분리
              </button>
            </div>
            <textarea
              disabled
              rows={6}
              placeholder="예: OO건설 청주A현장 복층유리 1200x1800 30장 2라인"
              className="w-full resize-none rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm outline-none"
            />
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              추후 AI API 연결을 고려해 로컬 파서 모듈로 분리해서 구현할 예정입니다.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            Supabase 연결과 등록 로직은 다음 Phase에서 이어서 구현합니다. 현재는 화면 구조를 먼저
            고정하고 있습니다.
          </div>
        </div>
        <div className="space-y-4">
          {[
            {
              step: "Step 1. 거래처/현장",
              fields: ["거래처", "현장"]
            },
            {
              step: "Step 2. 제품/규격",
              fields: ["공정", "품목코드", "품명", "가로", "세로", "수량"]
            },
            {
              step: "Step 3. 작업 정보",
              fields: ["라인", "의뢰번호", "등록자", "메모", "상태"]
            }
          ].map((group) => (
            <div key={group.step} className="rounded-2xl border border-black/5 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{group.step}</h3>
                <span className="rounded-full bg-[#f3f6f8] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                  준비 중
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {group.fields.map((field) => (
                  <label key={field} className="space-y-2 text-sm text-[var(--muted)]">
                    <span>{field}</span>
                    <input
                      disabled
                      className="w-full rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm text-[var(--foreground)] outline-none"
                      placeholder={`${field} 입력`}
                    />
                  </label>
                ))}
              </div>
              {group.step === "Step 3. 작업 정보" ? (
                <p className="mt-4 text-xs leading-5 text-[var(--warning)]">
                  회사 공식 계산식 확인 필요
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      </div>
    </SectionCard>
  );
}
