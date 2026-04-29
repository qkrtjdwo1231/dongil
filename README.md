# 동일유리 작업관리

동일유리의 MES 생산실적 파일을 업로드하고, 팀장과 대표가 조회/분석/AI 질의를 수행할 수 있는 내부용 Next.js 앱입니다.

현재 앱의 중심은 `직원 입력`이 아니라 아래 흐름입니다.

- 파일 업로드
- 업로드 데이터 구조화
- 대표/팀장 대시보드 분석
- 다차원 분석
- 업로드 기반 AI 분석
- 목표 대비/리스크/개선 포인트 확인

## 현재 역할 구조

- 팀장: 운영 현황, 프로젝트/일정/팀 관리, 업로드 검토, AI 질의
- 대표: KPI, 다차원 분석, 데이터 임포트, 데이터 그리드, 목표 설정, AI 분석

## 실행 방법

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

## 주요 환경변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_UPLOAD_BUCKET=uploads
GEMINI_API_KEY=
```

## 현재 주요 기능

### 업로드 / 구조화
- `.xlsx`, `.xls`, `.csv` 업로드
- 원본 파일 Storage 저장
- 행 단위 데이터 `uploaded_rows` 저장
- `pid`, `raw_payload`, `normalized_text` 보존
- 파일 단위 분석 요약(`analysis_snapshot`) 생성
- 기간, 총 수량, 총 평수, 상위 분포, 누락 현황, 체크 포인트 추출

### 팀장
- 대시보드
- 프로젝트
- 일정
- 팀 관리
- 설정
- PID/거래처/현장/품명/등록자 검색 기반 운영 화면
- 업로드 파일 검토와 AI 질의 가능

### 대표
- 대시보드
- 다차원 분석
- 목표 설정
- 데이터 그리드
- 데이터 임포트
- AI 분석
- 설정
- 업로드한 생산실적 파일과 저장된 행 데이터 기준 분석

### AI 분석
- 업로드한 파일과 저장된 행 데이터만 기준으로 답변
- 파일에 없는 내용은 추측하지 않음
- AI 기억 규칙 관리 가능
- 대표와 팀장 모두 사용 가능

## Supabase 추가 반영 메모

업로드 파일 분석 구조를 최신 상태로 쓰려면 `uploaded_files.analysis_snapshot` 컬럼이 필요합니다.
최신 `supabase/schema.sql`을 실행하거나, 아래 SQL을 직접 실행하면 됩니다.

```sql
alter table if exists public.uploaded_files
  add column if not exists analysis_snapshot jsonb not null default '{}'::jsonb;
```

## 배포 메모

- Framework Preset: `Next.js`
- Vercel 환경변수에도 아래 값을 직접 등록해야 합니다.
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_UPLOAD_BUCKET`
  - `GEMINI_API_KEY`

## GitHub 제외 파일

- `.env.local`
- `node_modules`
- `.next`
