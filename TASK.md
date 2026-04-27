# 동일유리 작업관리 TASK

## Phase 1. 프로젝트 초기 세팅

- [x] Next.js App Router + TypeScript + Tailwind CSS 프로젝트 초기 구성
- [x] 기본 폴더 구조 생성
- [x] 전역 스타일 및 기본 레이아웃 구성
- [x] `.gitignore` 작성
- [x] `.env.local.example` 작성
- [x] README 기본 구조 작성

## Phase 2. 공통 타입 및 유틸 구성

- [x] `lib/types.ts`에 핵심 타입 정의
- [x] `lib/constants.ts`에 역할, 상태, 공정, 기본 문구 상수 정의
- [x] `lib/calculations.ts`에 평수 계산 함수 작성
- [x] `lib/parsers.ts`에 빠른 문장 입력용 로컬 파서 작성
- [x] `lib/utils.ts`에 날짜, 숫자, 문자열 포맷 유틸 작성
- [x] `lib/order-helpers.ts`에 주문 복제 및 저장용 데이터 정리 함수 작성
- [x] `lib/recommendation.ts`에 거래처별 추천 데이터 가공 함수 작성

## Phase 3. Supabase 연동 기반 준비

- [x] `lib/supabaseClient.ts` 작성
- [x] Supabase 환경변수 누락 감지 처리
- [x] Supabase 미연결 시 fallback UI/데이터 구조 준비
- [x] `supabase/schema.sql` 작성
- [x] `supabase/seed.sql` 작성

## Phase 4. 공통 UI 컴포넌트 구현

- [x] `Header.tsx` 구현
- [x] `RoleSwitcher.tsx` 구현
- [x] `SectionCard.tsx` 구현
- [x] `StatusBadge.tsx` 구현
- [x] `EmptyState.tsx` 구현
- [x] `QuantityInput.tsx` 구현
- [x] `RecentOrderButton.tsx` 구현
- [x] `PlaceholderPanel.tsx` 구현

## Phase 5. 직원 대시보드 골격 구현

- [x] `StaffDashboard.tsx` 구현
- [x] 직원 메뉴 전환 상태 구현
- [x] 직원 화면 기본 레이아웃 구성
- [x] 팀장 placeholder 화면 연결
- [x] 대표 placeholder 화면 연결

## Phase 6. 기본 등록 기능 구현

- [ ] `BasicOrderForm.tsx` 기본 구조 구현
- [ ] 빠른 문장 입력 영역 구현
- [ ] `자동 분리` 버튼과 로컬 파서 연결
- [ ] 거래처 입력 및 기존 거래처 자동완성 구현
- [ ] 거래처 선택 시 최근 현장 추천 UI 구현
- [ ] 제품 및 규격 입력 영역 구현
- [ ] 작업 정보 입력 영역 구현
- [ ] 평수 자동 계산 표시 구현
- [ ] 필수값 검증 및 오류 메시지 구현
- [ ] 주문 저장 기능 구현
- [ ] `직전 주문 불러오기` 기능 연결
- [ ] `즐겨찾기로 저장` 기능 연결

## Phase 7. 빠른 등록 기능 구현

- [ ] `QuickRegister.tsx` 기본 구조 구현
- [ ] 거래처 검색 UI 구현
- [ ] 거래처 선택 시 최근 현장 추천 구현
- [ ] 거래처 + 현장 기준 자주 쓰는 품목 카드 구현
- [ ] 카드 선택 후 수량 입력 영역 구현
- [ ] 빠른 등록 저장 기능 구현
- [ ] `직전 주문 불러오기` 기능 연결

## Phase 8. 즐겨찾기 기능 구현

- [ ] `FavoritesPanel.tsx` 구현
- [ ] 즐겨찾기 목록 조회 구현
- [ ] 즐겨찾기 카드 UI 구현
- [ ] `불러오기` 기능 구현
- [ ] `바로 등록` 기능 구현
- [ ] 수량 없는 즐겨찾기용 입력 처리 구현

## Phase 9. 주문 목록 및 상태 관리 구현

- [ ] `OrderList.tsx` 구현
- [ ] 주문 목록 테이블 UI 구현
- [ ] 통합 검색 기능 구현
- [ ] 상태 필터 구현
- [ ] 행 클릭 상세 보기 또는 수정 모달 구현
- [ ] 상태 변경 버튼 구현

## Phase 10. 확인필요 목록 구현

- [ ] `NeedsCheckList.tsx` 구현
- [ ] 확인필요 조건 필터링 로직 구현
- [ ] 누락 항목이 드러나는 목록 UI 구현

## Phase 11. 메인 페이지 연결 및 마감 정리

- [ ] `app/page.tsx`에 전체 화면 조립
- [ ] `app/layout.tsx` 메타데이터 및 공통 구조 정리
- [ ] `app/globals.css` 업무용 대시보드 스타일 완성
- [ ] README 설치 및 배포 가이드 완성
- [ ] TODO 주석 추가
  - 추후 AI API 연결
  - 추후 Auth/권한 연결
  - 추후 팀장/대표 대시보드 구현

## 완료 기준

- [x] 로컬에서 `npm run dev` 실행 시 에러 없음
- [x] 로컬에서 `npm run build` 실행 시 에러 없음
- [ ] Vercel 배포 성공
- [ ] 모바일 반응형 정상 동작
- [ ] 핵심 기능 전체 플로우 테스트 완료
- [ ] Supabase 데이터 생성/조회/수정 정상 동작
- [ ] README.md 배포 안내 작성 완료
