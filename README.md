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

## 환경변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## GitHub 업로드 시 제외

- `.env.local`
- `node_modules`
- `.next`
