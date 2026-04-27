# 동일유리 작업관리 STRUCTURE

## 1. 전체 디렉토리 트리

```text
dongil/
├─ app/
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ components/
│  ├─ Header.tsx
│  ├─ RoleSwitcher.tsx
│  ├─ StaffDashboard.tsx
│  ├─ ExistingDataUploadPanel.tsx
│  ├─ BasicOrderForm.tsx
│  ├─ QuickRegister.tsx
│  ├─ OrderList.tsx
│  ├─ FavoritesPanel.tsx
│  ├─ NeedsCheckList.tsx
│  ├─ QuantityInput.tsx
│  ├─ RecentOrderButton.tsx
│  ├─ SectionCard.tsx
│  ├─ StatusBadge.tsx
│  ├─ EmptyState.tsx
│  └─ PlaceholderPanel.tsx
├─ lib/
│  ├─ supabaseClient.ts
│  ├─ parsers.ts
│  ├─ calculations.ts
│  ├─ types.ts
│  ├─ constants.ts
│  ├─ utils.ts
│  ├─ mockData.ts
│  ├─ data-access.ts
│  ├─ order-helpers.ts
│  ├─ recommendation.ts
│  └─ upload-parser.ts
├─ supabase/
│  ├─ schema.sql
│  └─ seed.sql
├─ public/
│  └─ placeholder.txt
├─ next-env.d.ts
├─ next.config.ts
├─ package.json
├─ postcss.config.js
├─ tsconfig.json
├─ .env.local.example
├─ .gitignore
├─ README.md
├─ idea.md
├─ PRD.md
├─ STRUCTURE.md
└─ TASK.md
```

## 2. 각 파일 및 폴더 역할 설명

### 2.1 `app/`

- Next.js App Router의 진입 영역이다.
- `layout.tsx`는 공통 레이아웃, 메타데이터, 전역 UI 골격을 담당한다.
- `page.tsx`는 메인 대시보드 진입 화면을 담당한다.
- `globals.css`는 Tailwind 기반 전역 스타일과 공통 색상, 배경, 타이포그래피 토큰을 정의한다.

### 2.2 `components/`

- 화면 기능 단위로 UI를 분리하는 영역이다.

#### `Header.tsx`

- 상단 서비스명과 역할 전환 UI를 포함한 공통 헤더를 렌더링한다.

#### `RoleSwitcher.tsx`

- 현재 역할 단일 버튼과 펼침형 역할 목록 UI를 담당한다.

#### `StaffDashboard.tsx`

- 직원 전용 메인 화면의 상단 탭 전환과 전체 상태 관리를 담당한다.

#### `ExistingDataUploadPanel.tsx`

- 파일 업로드 전용 카테고리 화면을 담당한다.

#### `BasicOrderForm.tsx`

- 빠른 문장 입력과 3단계 등록 폼을 포함한 기본 등록 화면을 담당한다.

#### `QuickRegister.tsx`

- 거래처 검색, 현장 추천, 자주 쓰는 조합 카드, 수량 기반 빠른 등록 흐름을 담당한다.

#### `OrderList.tsx`

- 주문 목록 테이블, 검색, 상태 필터, 상태 변경, 상세 보기 또는 수정 모달 진입을 담당한다.

#### `FavoritesPanel.tsx`

- 즐겨찾기 목록 카드, 불러오기, 바로 등록 흐름을 담당한다.

#### `NeedsCheckList.tsx`

- 확인필요 조건에 해당하는 주문 목록을 별도로 보여준다.

#### `QuantityInput.tsx`

- 수량 입력 필드와 `-`, `+`, `+1`, `+5`, `+10` 조작 UI를 공통 컴포넌트로 제공한다.

#### `RecentOrderButton.tsx`

- 직전 주문 불러오기 버튼과 관련 로딩 상태 UI를 담당한다.

#### `SectionCard.tsx`

- 입력 영역과 목록 영역을 카드 형태로 감싸는 공통 레이아웃 컴포넌트다.

#### `StatusBadge.tsx`

- 주문 상태값을 시각적으로 구분해 보여주는 배지 컴포넌트다.

#### `EmptyState.tsx`

- 조회 결과가 없거나 환경변수가 없을 때의 빈 상태 메시지를 표시한다.

#### `PlaceholderPanel.tsx`

- 팀장/대표 placeholder 화면을 공통 형식으로 렌더링한다.

### 2.3 `lib/`

- 데이터 처리, 타입, 계산, 추천 로직, Supabase 연결을 관리한다.

#### `supabaseClient.ts`

- Supabase 클라이언트 생성과 환경변수 존재 여부 확인을 담당한다.
- 연결 실패 또는 환경변수 누락 시 앱이 중단되지 않도록 안전한 분기 처리를 제공한다.

#### `parsers.ts`

- 빠른 문장 입력을 파싱하는 로컬 함수를 관리한다.
- 추후 AI API로 교체하기 쉽도록 입력 해석 로직을 이 파일에 집중시킨다.

#### `calculations.ts`

- 평수 계산 등 수치 계산 함수를 관리한다.

#### `types.ts`

- 주문, 즐겨찾기, 거래처, 품목, 역할, 추천 데이터 형태 등의 TypeScript 타입을 정의한다.

#### `constants.ts`

- 공정 목록, 상태 목록, 역할 목록, 기본 문구 등 반복 사용 상수를 정의한다.

#### `utils.ts`

- 공통 포맷 함수, 문자열 정리, 날짜 표시 유틸 등을 관리한다.

#### `mockData.ts`

- Supabase 미연결 상황에서도 UI를 확인할 수 있도록 샘플 데이터 또는 fallback 데이터를 관리한다.

#### `data-access.ts`

- 공용 대시보드 데이터 로딩, 주문 저장, 즐겨찾기 저장, 상태 변경, 업로드 일괄 저장을 담당한다.

#### `order-helpers.ts`

- 주문 저장용 페이로드 구성, 최근 주문 복제용 데이터 정리, 기본값 병합 등을 담당한다.

#### `recommendation.ts`

- 거래처별 최근 현장, 자주 쓰는 품목, 자주 쓰는 라인 추천용 데이터 가공 함수를 담당한다.

#### `upload-parser.ts`

- 엑셀 및 CSV 파일을 읽고 업로드 미리보기 행으로 변환하는 파서를 담당한다.

### 2.4 `supabase/`

- DB 초기 구성용 SQL 파일을 보관한다.

#### `schema.sql`

- 테이블, 기본값, 제약조건, 인덱스 등을 정의한다.

#### `seed.sql`

- 샘플 거래처, 품목, 주문, 즐겨찾기 데이터를 삽입한다.

### 2.5 `public/`

- 정적 파일 저장용 디렉토리다.
- MVP 단계에서는 별도 이미지가 없더라도 디렉토리 구조를 유지한다.

### 2.6 루트 문서 파일

#### `package.json`

- 프로젝트 의존성, npm 스크립트, Next.js 실행 설정을 관리한다.

#### `tsconfig.json`

- TypeScript 컴파일 기준과 경로 별칭 설정을 관리한다.

#### `next.config.ts`

- Next.js 런타임 옵션과 기본 프로젝트 설정을 관리한다.

#### `next-env.d.ts`

- Next.js가 제공하는 TypeScript 타입 참조 파일이다.

#### `postcss.config.js`

- Tailwind CSS를 App Router 프로젝트에 적용하기 위한 PostCSS 설정 파일이다.

#### `.env.local.example`

- Supabase 연결에 필요한 환경변수 예시를 제공한다.

#### `.gitignore`

- `node_modules`, `.next`, `.env.local` 등 GitHub에 올리면 안 되는 파일을 제외한다.

#### `README.md`

- 설치, 환경변수 설정, Supabase 초기화, 로컬 실행, GitHub 업로드, Vercel 배포 절차를 안내한다.

#### `idea.md`

- 서비스 아이디어와 기본 방향 문서다.

#### `PRD.md`

- 기능 및 요구사항 기준 문서다.

#### `STRUCTURE.md`

- 현재 문서로, 실제 파일 구조와 역할을 정의한다.

#### `TASK.md`

- 구현 단계별 작업 체크리스트 문서다.

## 3. 환경변수 목록

`.env.local` 기준으로 아래 값을 사용한다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 환경변수 설명

- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Supabase public anon key

## 4. Supabase 관련 파일 위치

- Supabase 클라이언트 연결 파일: `lib/supabaseClient.ts`
- 스키마 파일: `supabase/schema.sql`
- 시드 파일: `supabase/seed.sql`

## 5. 컴포넌트 분리 기준

- 공통 레이아웃과 역할 전환 UI는 헤더 계층으로 분리한다.
- 직원 기능은 화면 상단 탭 단위의 큰 화면 컴포넌트로 분리한다.
- 입력, 테이블, 상태 배지, 빈 상태, 수량 조절 등 반복 사용되는 UI는 재사용 컴포넌트로 분리한다.
- 데이터 가공, 추천 계산, 평수 계산, 로컬 파싱은 UI 컴포넌트 밖 `lib/` 영역으로 분리한다.
- Supabase 미연결 상태에서도 렌더링이 가능하도록 데이터 접근 로직과 표시 로직을 가능한 한 분리한다.
