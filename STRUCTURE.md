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
    BasicOrderForm.tsx
    ConsoleShell.tsx
    EmptyState.tsx
    ExecutiveDashboard.tsx
    ExecutiveGoalSettings.tsx
    ExecutiveSettingsPanel.tsx
    ExistingDataUploadPanel.tsx
    FavoritesPanel.tsx
    Header.tsx
    NeedsCheckList.tsx
    OrderList.tsx
    PlaceholderPanel.tsx
    QuantityInput.tsx
    QuickRegister.tsx
    RecentOrderButton.tsx
    RepresentativeAiWorkspace.tsx
    RoleSwitcher.tsx
    SectionCard.tsx
    StaffDashboard.tsx
    StatusBadge.tsx
    TeamLeadDashboard.tsx
    UploadChatPanel.tsx
    UploadRecommendationPanel.tsx
  lib/
    analytics.ts
    calculations.ts
    constants.ts
    data-access.ts
    gemini.ts
    mockData.ts
    order-helpers.ts
    parsers.ts
    recommendation.ts
    supabaseClient.ts
    types.ts
    upload-chat.ts
    upload-parser.ts
    upload-processing.ts
    utils.ts
  supabase/
    schema.sql
    seed.sql
  public/
    placeholder.txt
  .env.local.example
  README.md
  PRD.md
  STRUCTURE.md
  TASK.md
```

## 주요 폴더 역할

### `app/`
- Next.js App Router 진입점
- `/api/ai/*`: Gemini 기반 추천/챗봇/기억 규칙 API
- `/api/upload/*`: 업로드 미리보기, 저장 파일 관리, 주문 반영 API

### `components/`
- 역할별 화면과 재사용 UI 컴포넌트 모음
- `StaffDashboard.tsx`: 역할 전환 진입점
- `TeamLeadDashboard.tsx`: 팀장 콘솔
- `ExecutiveDashboard.tsx`: 대표 분석 콘솔
- `ExistingDataUploadPanel.tsx`: 업로드/저장/미리보기/AI 통합 작업공간

### `lib/`
- 데이터 가공, 집계, 파서, Supabase 연결, Gemini 호출 로직
- `analytics.ts`: 대표/팀장 대시보드용 집계 함수
- `upload-processing.ts`, `upload-parser.ts`: 업로드 데이터 정리 로직
- `upload-chat.ts`: 업로드 데이터 기반 AI 프롬프트와 검색 컨텍스트 생성

### `supabase/`
- SQL 스키마와 샘플 데이터

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

- 역할 단위: 직원 / 팀장 / 대표 화면 분리
- 기능 단위: 업로드, AI 분석, 목표 설정, 주문 목록, 체크리스트 분리
- 공통 단위: 카드, 배지, 수량 입력, 역할 전환, 셸 레이아웃 분리
