# 동일유리 작업관리 TASK

## Phase 1. 프로젝트 초기 세팅
- [x] Next.js App Router + TypeScript + Tailwind CSS 초기 구성
- [x] 공통 레이아웃, 환경변수 예시, README 구성
- [x] Supabase 연결 준비 및 SQL 파일 작성

## Phase 2. 공통 데이터/유틸 구성
- [x] `lib/types.ts` 공통 타입 정의
- [x] `lib/constants.ts` 역할/공정/상태 상수 정의
- [x] `lib/calculations.ts`, `lib/parsers.ts`, `lib/utils.ts` 작성
- [x] `lib/data-access.ts` 공용 데이터 접근 구성

## Phase 3. 직원용 초기 기능 구성
- [x] 기본 등록 화면
- [x] 빠른 등록 화면
- [x] 주문 목록
- [x] 체크리스트
- [x] 즐겨찾기

## Phase 4. 업로드 및 AI 기반 구조 확장
- [x] 파일 업로드 미리보기
- [x] 업로드 결과 주문 저장
- [x] Storage 원본 파일 저장
- [x] 업로드 이력 유지
- [x] `uploaded_files`, `uploaded_rows` 기반 구조 반영
- [x] `pid`, `raw_payload` 저장 반영
- [x] 업로드 기반 AI 챗봇
- [x] AI 기억 규칙 관리
- [x] 업로드 기반 추천/실시간 후보 추천

## Phase 5. 팀장/대표 콘솔 재구성
- [x] 팀장 콘솔 셸 구현
- [x] 팀장 대시보드 / 프로젝트 / 일정 / 팀 관리 / 설정 화면 구현
- [x] 대표 콘솔 셸 구현
- [x] 대표 대시보드 / 다차원 분석 / 목표 설정 / 데이터 그리드 / 데이터 임포트 / AI 분석 / 설정 화면 구현
- [x] 역할 전환 시 콘솔 구조 연결
- [x] 깨진 한글 텍스트 주요 파일 정리

## 완료 기준
- [x] 로컬에서 `npm run dev` 실행 시 에러 없음
- [x] 로컬에서 `npm run build` 실행 시 에러 없음
- [ ] Vercel 배포 최종 확인
- [ ] 모바일 반응형 최종 점검
- [x] 핵심 기능 전체 플로우 구현 완료
- [x] Supabase 데이터 생성/조회/수정 정상 동작 구조 반영
- [x] README 배포 안내 작성 완료
