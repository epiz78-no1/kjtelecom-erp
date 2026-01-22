# KJ Telecom ERP Design Guide: UI/UX Pro Max Scale

> [!IMPORTANT]
> **표준 UI 지침**: 앞으로 모든 페이지와 기능 개발에는 'UI/UX Pro Max Scale' 컨셉(Glassmorphism, Bento Grid)을 필수적으로 적용해야 합니다. 이 지침은 시스템 전반의 일관성과 프리미엄한 사용자 경험을 유지하기 위한 핵심 원칙입니다.

---

## 1. 핵심 디자인 원칙 (Core Principles)

### A. Glassmorphism (글래스모피즘)
- **적용 대상**: 다이얼로그(Dialog), 카드(Card), 플로팅 패널.
- **스타일**: 배경 반투명 처리와 강력한 블러 효과를 조합합니다.
- **CSS 클래스**: `bg-background/80 backdrop-blur-xl border-white/20 shadow-2xl`

### B. Bento Grid Layout
- **적용 대상**: 대시보드, 필터 패널, 통계 요약 영역.
- **스타일**: 각 요소를 독립된 카드 형태로 구성하고, 명확한 그리드 시스템(`grid-cols-*`)을 사용하여 정보를 구획합니다.

### C. Compact & Dense UI
- **목표**: 한 화면에 더 많은 정보를 시각적 피로도 없이 제공합니다.
- **표준 높이**:
  - **Top Navigation / Sidebar**: `h-12` (기존 `h-16`에서 축소)
  - **Inputs / Buttons**: `h-9` (기존 `h-10`에서 축소)
  - **Table Rows**: `h-8` (Header), `h-6~7` (Body)

---

## 2. 테이블 표준 (Table Standards)

### A. 정렬 규칙 (Alignment Rules)
사용자 가독성을 위해 데이터 타입별로 정렬을 엄격히 구분합니다.
- **Header (TableHead)**: 모든 헤더는 **가운데 정렬(`text-center`)**
- **Body (TableCell)**:
  - **왼쪽 정렬 (`text-left`)**:
    - **공사명 (`projectName`)**: 긴 텍스트 가독성 확보
    - **비고 (`remark`)**: 긴 텍스트 가독성 확보
  - **오른쪽 정렬 (`text-right`)**:
    - **단가/금액 (`unitPrice`, `amount`)**: 숫자 데이터 비교 용이성 확보
  - **가운데 정렬 (`text-center`)**:
    - **나머지 모든 컬럼**: 품명(`productName`), 규격(`spec`), 수량(`quantity`), 번호, 날짜, 구분, 카테고리 등

### B. 컬럼 너비 표준화
- `src/lib/optical-table-columns.ts`에 정의된 상수를 사용하여 입/출고 등 연관된 화면 간 너비를 통일합니다.
- 중요 컬럼 예시:
  - `projectName`: 250
  - `projectCode`: 120
  - `drumNo`: 70
  - `spec`: 50
  - `receivedDate`: 95

### C. 인터랙션
- **Hover**: 행(Row)에 마우스 오버 시 `hover:bg-muted/50` 효과 적용.
- **Sticky**: 헤더는 `sticky top-0`와 `z-10`을 적용하여 스크롤 시에도 고정.

---

## 3. 다이얼로그 표준 (Dialog Patterns)

모든 등록/수정 다이얼로그는 다음 'Pro Max' 스타일을 따릅니다.

### A. 레이아웃 및 테마
- **배경**: `bg-background/80 backdrop-blur-xl`
- **헤더**: 상단에 얇은 그라데이션 인디케이터 라인 추가 (`bg-gradient-to-r from-primary to-blue-400 h-1`).
- **입력 필드**: `bg-slate-50/50` 배경색과 `h-9` 높이를 사용하며, 라벨은 `text-slate-500 font-semibold`로 가독성을 높입니다.

### B. 첨부파일 영역
- 점선 테두리(`border-dashed`)의 업로드 영역을 구성합니다.
- 파일 선택 후 리스트는 회색 박스(`bg-muted/50`) 형태의 카드 레이아웃을 사용합니다.

---

## 4. 버튼 및 액션 (Buttons & Actions)

### A. 아이콘 버튼
- 가로 공간 절약을 위해 헤더의 보조 액션(Excel 다운로드, 필터 등)은 아이콘 버튼(`Button variant="ghost" size="icon"`)을 사용합니다.
- 반드시 `Tooltip`을 감싸서 해당 기능을 설명해야 합니다.

### B. 대표 액션
- 등록/추가와 같은 주된 액션은 `Primary` 색상의 버튼을 사용하되, `h-9` 높이로 콤팩트하게 유지합니다.

---

## 5. 아이콘 가이드
- 라이브러리: `lucide-react`
- 크기: 기본 `h-4 w-4` 또는 `h-5 w-5` (버튼 내부)
- 스타일: 얇은 선 두께(`stroke-width={1.5}`)를 권장하여 모던한 느낌을 줍니다.

---

이 지침은 **광케이블 모듈**을 시작으로 전 시스템에 순차적으로 적용됩니다. 새로운 기능 개발 시 이 문서의 패턴을 최우선으로 참고하십시오.
