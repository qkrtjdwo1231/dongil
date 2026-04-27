# 동일유리 작업관리 PRD

## 1. 프로젝트 개요

### 1.1 서비스명

- 동일유리 작업관리

### 1.2 목적

- 기존 엑셀 기반 등록 업무를 웹 UI 중심의 등록 방식으로 전환한다.
- 직원이 주문 및 작업 데이터를 빠르게 입력하고, 기존 거래처·현장·품목 정보를 검색 및 재사용할 수 있게 한다.
- 반복 입력을 줄이고 누락 가능성을 낮춰 등록 효율과 정확도를 높인다.

### 1.3 범위

- 1차 MVP에서는 직원 화면의 핵심 등록 기능을 구현한다.
- 팀장 및 대표 화면은 실제 기능 없이 placeholder UI만 제공한다.
- 인증 및 권한 제어는 이번 단계에서 구현하지 않는다.
- AI API 연동은 이번 단계에서 구현하지 않으며, 추후 교체 가능한 로컬 파서를 사용한다.

## 2. 기능 요구사항

### 2.1 공통 화면 구조

- 상단 헤더 좌측에 서비스명 "동일유리 작업관리"를 표시한다.
- 상단 헤더 우측에 역할 전환 버튼 `직원`, `팀장`, `대표`를 제공한다.
- 역할 전환은 UI 상태 전환만 처리하며 로그인이나 실제 권한 검사는 수행하지 않는다.

### 2.2 직원 화면 메뉴

- 직원 화면에는 아래 메뉴를 제공한다.
- 기본 등록
- 빠른 등록
- 주문 목록
- 즐겨찾기
- 확인필요

### 2.3 기본 등록

#### 2.3.1 빠른 문장 입력

- 사용자가 한 줄 또는 여러 단어로 주문 내용을 빠르게 입력할 수 있는 입력 영역을 제공한다.
- 예시 문구는 다음과 같이 표시한다.
- `예: OO건설 청주A현장 복층유리 1200x1800 30장 2라인`
- `자동 분리` 버튼을 제공한다.
- 로컬 파서는 아래 규칙을 처리한다.
- `숫자x숫자` 또는 `숫자 X 숫자` 패턴에서 가로, 세로를 추출한다.
- `30장`, `30개` 같은 패턴에서 수량을 추출한다.
- `1라인`, `2라인` 같은 패턴에서 라인을 추출한다.
- 추출 후 남은 텍스트는 품명 후보 또는 메모 후보로 분류 가능한 형태로 폼에 반영한다.
- 해당 파서는 추후 AI API로 교체 가능하도록 별도 모듈로 분리한다.

#### 2.3.2 3단계 등록 폼

##### Step 1. 거래처/현장

- 거래처 `customer` 입력 필드를 제공한다.
- 기존 거래처 목록을 기반으로 자동완성 또는 datalist를 제공한다.
- 현장 `site` 입력 필드를 제공한다.
- 거래처가 선택되면 해당 거래처의 최근 주문 데이터를 기준으로 자주 사용한 현장 후보를 표시한다.

##### Step 2. 제품/규격

- 공정 `process` 선택 필드를 제공한다.
- 선택값은 `복층`, `강화`, `접합`, `창호`, `기타`로 구성한다.
- 품목코드 `item_code` 입력 필드를 제공한다.
- 품명 `item_name` 입력 필드를 제공한다.
- 가로 `width`, 세로 `height`, 수량 `quantity` 입력 필드를 제공한다.
- 수량 입력에는 `-`, `+`, `+1`, `+5`, `+10` 버튼을 제공한다.

##### Step 3. 작업 정보

- 라인 `line` 입력 필드를 제공한다.
- 의뢰번호 `request_no` 입력 필드를 제공한다.
- 등록자 `registrant` 입력 필드를 제공한다.
- 메모 `memo` 입력 필드를 제공한다.
- 상태 `status` 기본값은 `등록`으로 설정한다.
- 평수 `area_pyeong`은 `width`, `height`, `quantity`가 모두 있을 때 자동 계산한다.
- 계산식은 아래를 사용한다.
- `area_pyeong = width * height * quantity / 1000000 / 3.3058`
- 계산 영역 근처에 `회사 공식 계산식 확인 필요` 안내 문구를 표시한다.

#### 2.3.3 저장 규칙

- 등록 버튼 클릭 시 `orders` 테이블에 데이터를 저장한다.
- 필수값은 아래와 같다.
- `customer`
- `item_name`
- `quantity`
- 필수값 누락 시 저장하지 않고 사용자에게 오류 메시지를 표시한다.

### 2.4 빠른 등록

- 거래처 검색 입력창을 제공한다.
- 검색 결과 또는 기존 거래처 목록을 보여준다.
- 거래처 선택 시 해당 거래처의 최근 주문을 분석하여 자주 나온 현장 목록을 보여준다.
- 현장 선택 시 해당 거래처와 현장에서 자주 사용된 품명, 규격, 라인 조합을 카드 형태로 표시한다.
- 카드에는 최근 사용 횟수를 함께 표시한다.
- 카드 선택 후 수량 입력 영역을 보여준다.
- 사용자는 수량만 수정한 후 `빠른 등록` 버튼으로 신규 주문을 저장할 수 있다.
- 수량 입력에는 `-`, `+`, `+1`, `+5`, `+10` 버튼을 제공한다.

### 2.5 직전 주문 불러오기

- 기본 등록 화면과 빠른 등록 화면 상단에 `직전 주문 불러오기` 버튼을 배치한다.
- 버튼 클릭 시 `orders`에서 `created_at` 기준 가장 최근 주문 1건을 가져온다.
- 가져온 데이터를 현재 입력 폼에 채운다.
- 저장 시 `id`, `created_at`은 새로운 값으로 생성되어야 한다.

### 2.6 즐겨찾기

- 기본 등록 화면에서 현재 입력값을 즐겨찾기로 저장할 수 있다.
- 버튼명은 `즐겨찾기로 저장`으로 한다.
- 즐겨찾기 화면에서는 카드 목록 형태로 데이터를 보여준다.
- 카드에는 거래처, 현장, 품명, 가로, 세로, 기본 수량, 라인을 표시한다.
- 각 카드에는 `불러오기` 버튼과 `바로 등록` 버튼을 제공한다.
- `불러오기`는 기본 등록 폼에 값을 채우는 동작을 수행한다.
- `바로 등록`은 즉시 주문 생성 플로우로 이어진다.
- 즐겨찾기 데이터에 수량이 없으면 수량 입력 모달을 먼저 표시한다.

### 2.7 거래처별 기본값 추천

- 기본 등록 화면에서 거래처를 입력하거나 선택하면 최근 주문 5개를 조회한다.
- 추천 정보는 아래 세 가지로 구성한다.
- 최근 현장
- 자주 쓰는 품목 및 규격
- 자주 쓰는 라인
- 추천값은 작은 버튼 또는 태그 형태로 표시한다.
- 클릭 시 관련 입력값이 폼에 자동 반영된다.

### 2.8 주문 목록

- `orders` 데이터를 테이블 형태로 표시한다.
- 표시 컬럼은 아래와 같다.
- 등록일시
- 상태
- 거래처
- 현장
- 공정
- 품목코드
- 품명
- 가로
- 세로
- 수량
- 평수
- 의뢰번호
- NO
- 라인
- 등록자
- 거래처, 현장, 품명, 품목코드 기준 통합 검색을 제공한다.
- 상태 기준 필터를 제공한다.
- 필터 값은 `전체`, `등록`, `확인필요`, `진행`, `완료`다.
- 각 행 클릭 시 상세 보기 또는 수정 모달을 표시한다.
- 상태 변경 버튼으로 아래 값을 변경할 수 있다.
- `등록`
- `확인필요`
- `진행`
- `완료`
- `보류`

### 2.9 확인필요 목록

- 아래 조건 중 하나라도 만족하는 주문을 별도 목록으로 보여준다.
- `item_name` 없음
- `quantity` 없음 또는 `0`
- `customer` 없음
- `width` 없음
- `height` 없음
- `status`가 `확인필요`
- 단, 실제 등록 시 `customer`, `item_name`, `quantity`는 필수값이므로, 운영상으로는 규격 누락 또는 상태값 기준 검토가 중심이 된다.

### 2.10 팀장 화면

- 실제 기능 구현 없이 placeholder 문구만 표시한다.
- 표시 문구:
- `팀장 화면은 추후 오늘 할 일, 납기 임박, 진행 현황을 표시할 예정입니다.`

### 2.11 대표 화면

- 실제 기능 구현 없이 placeholder 문구만 표시한다.
- 표시 문구:
- `대표 화면은 추후 전체 주문 현황, 거래처별 주문량, 납기 지연 현황을 표시할 예정입니다.`

### 2.12 Supabase 연결 예외 처리

- 환경변수는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 사용한다.
- 환경변수가 없거나 Supabase 연결이 실패해도 앱 전체가 중단되면 안 된다.
- UI에 `Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인하세요.` 안내를 표시한다.

## 3. 비기능 요구사항

### 3.1 성능

- 주요 화면은 초기 로딩 후 사용자가 빠르게 입력할 수 있어야 한다.
- 거래처 추천, 현장 추천, 최근값 표시 등은 반복 입력을 줄이는 수준의 응답성을 제공해야 한다.
- 목록 화면은 기본적인 검색과 필터링 시 체감 지연이 크지 않아야 한다.

### 3.2 보안

- 1차 MVP에서는 인증 기능을 구현하지 않는다.
- 다만 구조상 추후 인증 및 권한 기능을 추가할 수 있게 분리된 구조를 유지한다.
- Supabase 공개 키는 클라이언트 사용 범위로만 노출한다.

### 3.3 반응형

- 우선순위는 PC 웹이다.
- 태블릿 및 모바일에서도 레이아웃이 깨지지 않도록 기본 반응형을 제공한다.

### 3.4 유지보수성

- 빠른 문장 입력 파서는 별도 모듈로 분리한다.
- 화면 컴포넌트는 기능별로 분리한다.
- 데이터 타입은 공통 타입 파일에서 관리한다.
- 추후 AI API, Auth, 역할별 대시보드 기능을 연결하기 쉬운 구조를 유지한다.

## 4. 데이터베이스 스키마

### 4.1 orders

- `id`: uuid, primary key
- `created_at`: timestamp
- `pid`: text nullable
- `process`: text nullable
- `item_code`: text nullable
- `item_name`: text
- `width`: numeric nullable
- `height`: numeric nullable
- `quantity`: integer
- `area_pyeong`: numeric nullable
- `request_no`: text nullable
- `no`: text nullable
- `customer`: text
- `site`: text nullable
- `line`: text nullable
- `registrant`: text nullable
- `status`: text
- `memo`: text nullable
- `is_favorite_source`: boolean default false

### 4.2 favorites

- `id`: uuid, primary key
- `created_at`: timestamp
- `name`: text
- `process`: text nullable
- `item_code`: text nullable
- `item_name`: text
- `width`: numeric nullable
- `height`: numeric nullable
- `quantity`: integer nullable
- `customer`: text
- `site`: text nullable
- `line`: text nullable
- `memo`: text nullable

### 4.3 customers

- `id`: uuid, primary key
- `created_at`: timestamp
- `name`: text
- `default_site`: text nullable
- `default_line`: text nullable
- `memo`: text nullable

### 4.4 items

- `id`: uuid, primary key
- `created_at`: timestamp
- `item_code`: text nullable
- `item_name`: text
- `process`: text nullable
- `width`: numeric nullable
- `height`: numeric nullable
- `default_quantity`: integer nullable
- `memo`: text nullable

## 5. API 명세

본 MVP는 Next.js 앱 내부에서 Supabase 클라이언트를 통해 직접 CRUD를 수행하는 구조를 기본으로 한다. 다만 유지보수성과 확장성을 위해 아래 논리 API 단위를 기준으로 설계한다.

### 5.1 주문 생성

- 엔드포인트: `/api/orders`
- 메서드: `POST`
- 요청 구조:

```json
{
  "customer": "OO건설",
  "site": "청주A현장",
  "process": "복층",
  "item_code": "DG-001",
  "item_name": "복층유리",
  "width": 1200,
  "height": 1800,
  "quantity": 30,
  "line": "2라인",
  "request_no": "REQ-001",
  "registrant": "홍길동",
  "memo": "긴급",
  "status": "등록"
}
```

- 응답 구조:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customer": "OO건설"
  }
}
```

### 5.2 주문 목록 조회

- 엔드포인트: `/api/orders`
- 메서드: `GET`
- 요청 구조:
- query string으로 `search`, `status`, `customer`, `site` 등을 받을 수 있다.
- 응답 구조:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "customer": "OO건설",
      "item_name": "복층유리",
      "quantity": 30
    }
  ]
}
```

### 5.3 주문 수정

- 엔드포인트: `/api/orders/:id`
- 메서드: `PATCH`
- 요청 구조:

```json
{
  "status": "진행",
  "memo": "확인 완료"
}
```

- 응답 구조:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "진행"
  }
}
```

### 5.4 최근 주문 조회

- 엔드포인트: `/api/orders/latest`
- 메서드: `GET`
- 응답 구조:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customer": "OO건설",
    "item_name": "복층유리"
  }
}
```

### 5.5 즐겨찾기 생성

- 엔드포인트: `/api/favorites`
- 메서드: `POST`
- 요청 구조:

```json
{
  "name": "OO건설 청주A 복층 기본",
  "customer": "OO건설",
  "site": "청주A현장",
  "item_name": "복층유리",
  "width": 1200,
  "height": 1800,
  "quantity": 30,
  "line": "2라인"
}
```

- 응답 구조:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "OO건설 청주A 복층 기본"
  }
}
```

### 5.6 즐겨찾기 목록 조회

- 엔드포인트: `/api/favorites`
- 메서드: `GET`
- 응답 구조:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "OO건설 청주A 복층 기본"
    }
  ]
}
```

### 5.7 거래처 목록 조회

- 엔드포인트: `/api/customers`
- 메서드: `GET`
- 응답 구조:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "OO건설"
    }
  ]
}
```

### 5.8 품목 목록 조회

- 엔드포인트: `/api/items`
- 메서드: `GET`
- 응답 구조:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "item_name": "복층유리"
    }
  ]
}
```

## 6. UI/UX 요구사항

- 전체 UI는 업무용 SaaS 스타일의 깔끔한 대시보드 느낌으로 설계한다.
- 배경은 연한 회색 계열을 사용하고, 카드와 테이블 중심으로 화면을 구성한다.
- 엑셀 컬럼을 한 줄로 나열하는 방식 대신, 단계별 카드 및 섹션으로 입력 흐름을 나눈다.
- 버튼은 명확한 우선순위와 시각적 구분을 제공해야 한다.
- 직원이 헷갈리지 않도록 과한 애니메이션은 사용하지 않는다.
- 한 화면에 너무 많은 입력칸을 한 줄로 몰아 넣지 않는다.
- 기본 등록은 빠른 문장 입력과 3단계 입력 흐름이 자연스럽게 연결되도록 구성한다.
- 빠른 등록은 검색, 선택, 수량 조정, 등록 흐름이 짧고 직관적이어야 한다.
- 주문 목록은 테이블 가독성이 좋아야 하며, 검색과 상태 변경이 빠르게 가능해야 한다.
- 오류 메시지와 빈 상태 메시지는 모두 자연스러운 한국어로 표시한다.

## 7. 향후 확장 고려사항

- 추후 AI API 연결을 위한 빠른 문장 입력 파서 교체
- 추후 Auth 및 역할별 권한 제어 연결
- 추후 팀장 및 대표용 대시보드 고도화
