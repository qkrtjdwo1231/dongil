# 동일유리 작업관리

청주 소재 유리/창호 제조·시공 업체의 내부 엑셀 등록 업무를 웹 UI 중심으로 전환하기 위한 직원용 MVP입니다.

## 현재 진행 상태

- Step 1 `idea.md` 작성 완료
- Step 2 `PRD.md` 작성 완료
- Step 3 PRD 검토 및 확정 완료
- Step 4 `STRUCTURE.md` 작성 완료
- Step 5 `TASK.md` 작성 완료
- Step 6 개발 진행 중

## 개발 환경

- Next.js App Router
- TypeScript
- Tailwind CSS
- XLSX 파일 파싱
- Supabase
- Vercel
- npm

## 실행 준비

1. `npm install`
2. `.env.local` 생성
3. Supabase 프로젝트 생성
4. `supabase/schema.sql` 실행
5. `supabase/seed.sql` 실행
6. `npm run dev`
7. GitHub push
8. Vercel import
9. 환경변수 등록
10. 배포 확인

## 주요 기능

- 파일 업로드
- 기본 등록
- 빠른 등록
- 주문 목록 검색 및 상태 변경
- 체크리스트
- 즐겨찾기 저장, 불러오기, 바로 등록
- 직전 주문 불러오기

## 파일 업로드 사용 방법

1. `파일 업로드` 탭으로 이동
2. `.xlsx`, `.xls`, `.csv` 파일 선택
3. 미리보기에서 유효 행과 검토 필요 행 확인
4. `유효 행 N건 저장` 버튼으로 주문 일괄 등록

거래처, 품명, 수량이 없는 행은 업로드 미리보기에서 검토 필요로 표시됩니다.

## 환경변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## GitHub 업로드 시 제외

- `.env.local`
- `node_modules`
- `.next`

## Vercel 배포 메모

- Framework Preset은 `Next.js`
- Root Directory는 저장소 루트
- 환경변수는 Vercel 프로젝트 설정에서 직접 등록
- 등록할 값
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
