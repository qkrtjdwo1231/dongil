# 동일유리 작업관리 STRUCTURE

## 디렉토리 트리

```text
dongil/
  app/
    globals.css
    layout.tsx
    page.tsx
    api/
      ai/
        live-order-suggest/route.ts
        memory-rules/route.ts
        order-recommend/route.ts
        test/route.ts
        upload-chat/route.ts
      upload/
        files/route.ts
        import/route.ts
        preview/route.ts
  components/
    AiMemoryRulesPanel.tsx
    ConsoleShell.tsx
    EmptyState.tsx
    ExecutiveDashboard.tsx
    ExecutiveGoalSettings.tsx
    ExecutiveSettingsPanel.tsx
    ExistingDataUploadPanel.tsx
    Header.tsx
    RepresentativeAiWorkspace.tsx
    RoleSwitcher.tsx
    SectionCard.tsx
    StaffDashboard.tsx
    StatusBadge.tsx
    TeamLeadDashboard.tsx
    UploadChatPanel.tsx
    planned/
      ExecutiveSummaryCards.tsx
      ExecutiveBriefingPanel.tsx
      LineAnalysisPanel.tsx
      ProductMixAnalysisPanel.tsx
      CustomerSiteAnalysisPanel.tsx
      TimeLoadAnalysisPanel.tsx
      DataQualityPanel.tsx
      AnomalyInsightsPanel.tsx
      AiReportPanel.tsx
  lib/
    analytics.ts
    calculations.ts
    constants.ts
    data-access.ts
    gemini.ts
    mockData.ts
    parsers.ts
    supabaseClient.ts
    types.ts
    upload-chat.ts
    upload-parser.ts
    upload-processing.ts
    utils.ts
    planned/
      anomaly-rules.ts
      product-family.ts
      quality-metrics.ts
      time-buckets.ts
      executive-report.ts
  supabase/
    schema.sql
    seed.sql
  public/
    placeholder.txt
  .env.local.example
  PRD.md
  README.md
  STRUCTURE.md
  TASK.md
```

## 주요 폴더 역할

### `app/`
- Next.js App Router 진입점
- `/api/ai/*`: 업로드 데이터 기반 챗봇, 기억 규칙 관리, 레거시 추천 API
- `/api/upload/*`: 업로드 미리보기, 구조화 데이터 저장, Storage 파일 관리 API

### `components/`
- 역할별 화면과 재사용 UI 컴포넌트 모음
- `StaffDashboard.tsx`: 역할 전환 진입점 (`팀장 / 대표`)
- `TeamLeadDashboard.tsx`: 팀장 콘솔
- `ExecutiveDashboard.tsx`: 대표 분석 콘솔
- `ExistingDataUploadPanel.tsx`: 업로드, 구조화 요약, 저장 파일 관리, AI 연결이 모인 통합 작업공간
- `RepresentativeAiWorkspace.tsx`: 대표용 AI 분석 화면
- `planned/*`: 아직 구현 전이지만 대표 분석 고도화 시 분리될 가능성이 높은 전용 분석 컴포넌트 묶음

### `lib/`
- 데이터 가공, 업로드 구조화, 집계, Supabase 연결, Gemini 호출 로직
- `analytics.ts`: 대표/팀장 대시보드용 KPI와 집계 함수
- `upload-processing.ts`: 업로드 파일을 행 단위로 구조화하고 파일 단위 분석 요약을 생성하는 핵심 로직
- `upload-parser.ts`: 업로드 미리보기/보조 파싱용 로직
- `upload-chat.ts`: 업로드 데이터 기반 AI 프롬프트와 검색 컨텍스트 생성
- `planned/*`: 제품군 분류, 이상징후 규칙, 시간대 분석, 데이터 품질 집계, 대표 자동 리포트 전용 유틸의 예정 위치

### `supabase/`
- SQL 스키마와 샘플 데이터
- `uploaded_files.analysis_snapshot`를 포함한 업로드 분석 구조 정의

## 환경변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_UPLOAD_BUCKET=uploads
GEMINI_API_KEY=
```

## Supabase 관련 파일 위치

- 클라이언트 연결: `lib/supabaseClient.ts`
- 스키마: `supabase/schema.sql`
- 샘플 데이터: `supabase/seed.sql`

## 컴포넌트 분리 기준

- 역할 단위: `팀장`, `대표` 화면 분리
- 기능 단위: 업로드, KPI 대시보드, 라인 분석, 품목/제품군 분석, 거래처/현장 분석, 시간대 분석, 데이터 품질, AI 분석 분리
- 공통 단위: 헤더, 역할 전환, 카드, 셸 레이아웃 분리

## 데이터 구조 원칙

- 원본 파일은 Storage에 보존
- 행 단위 데이터는 `uploaded_rows`에 보존
- 파일 단위 구조화 요약은 `uploaded_files.analysis_snapshot`에 저장
- AI는 원본 파일 전체를 직접 읽지 않고 DB 조회 결과와 구조화 요약을 우선 사용

## 대표 분석 시스템 확장 방향

### 1. 업로드 계층
- 원본 저장
- 행 단위 구조화
- 제품군 분류
- 시간대 버킷 생성
- 데이터 품질 스냅샷 생성
- 이상징후 후보 생성

### 2. 대표 대시보드 계층
- KPI 카드
- 대표 브리핑 카드
- 리스크/경고 카드
- 액션 제안 카드

### 3. 세부 분석 계층
- 라인 분석
- 품목/제품군 분석
- 거래처/현장 분석
- 시간대/작업 부하 분석
- 데이터 품질 분석

### 4. AI 계층
- 업로드 기반 챗봇
- 대표 자동 리포트
- 질문 템플릿
- `가능한 해석 / 추가 데이터 필요 해석` 구분
