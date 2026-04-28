# 동일유리 작업관리

동일유리의 주문/업로드/분석 업무를 웹으로 관리하는 내부용 Next.js 앱입니다.

현재 구조는 세 가지 역할 화면을 함께 제공합니다.

- 직원: 기존 등록/빠른 등록/업로드 보조 화면
- 팀장: 팀 관리 콘솔, 프로젝트/일정/작업자 현황 중심 화면
- 대표: 생산실적 분석 시스템, 업로드 기반 KPI/다차원 분석/목표/AI 분석 화면

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

### 공통
- 역할 전환 UI
- Supabase 미설정 시 안전한 안내 메시지
- 업로드/분석/주문 데이터 공통 로딩

### 직원
- 기본 등록
- 빠른 등록
- 주문 목록
- 체크리스트
- 즐겨찾기
- 파일 업로드

### 팀장
- 대시보드
- 프로젝트
- 일정
- 팀 관리
- 설정
- PID/거래처/현장/품명/등록자 검색 기반 운영

### 대표
- 대시보드
- 다차원 분석
- 목표 설정
- 데이터 그리드
- 데이터 임포트
- AI 분석
- 설정
- 업로드한 파일과 저장된 생산실적 데이터 기반 분석

## 업로드/AI 관련

- 업로드 파일은 Storage에 저장됩니다.
- 업로드 행은 `uploaded_rows`에 저장됩니다.
- `pid`와 원본 행 전체 `raw_payload`를 함께 보존합니다.
- AI 답변과 추천은 업로드된 파일과 저장된 데이터만 기준으로 생성합니다.

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
