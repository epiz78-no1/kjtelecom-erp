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

### D. 아이콘 및 버튼 표준 (Icons & Buttons in Table)
- **첨부파일 (Attachment)**:
  - **단일 파일**: `<Download />` 아이콘 사용. 클릭 시 바로 다운로드.
  - **다중 파일**: `<Paperclip />` 아이콘 + 파일 개수 표시(예: `2`). 클릭 시 팝오버(Popover) 메뉴 노출.
  - **공통 스타일**: `Button variant="ghost" size="icon"` 또는 `size="sm"` 사용.

---

## 3. 다이얼로그 표준 (Dialog Patterns)

모든 데이터 등록/수정 다이얼로그는 첨부된 표준 이미지(입고 등록 예시)의 'Pro Max' 스타일을 엄격히 따릅니다.

### A. 컨테이너 및 헤더 (Container & Header)
- **DialogContent**: `max-w-[750px] p-0 overflow-hidden border-white/20 bg-background/80 backdrop-blur-xl shadow-2xl`
- **Top Gradient**: 최상단에 얇은 그라데이션 라인 배치 (`h-1.5 w-full bg-gradient-to-r ...`). 색상은 모듈별 테마를 따릅니다.
  - *입고(Green/Teal)*, *출고(Orange/Amber)*, *광케이블(Blue/Indigo)*, *철거(Red)*
- **Title**: `text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent`
- **Description**: `text-xs text-slate-500`

### B. 폼 레이아웃 (Form Layout)
- **Section Headers**: 좌측에 컬러 바(`h-4 w-1 rounded-full`)와 함께 섹션 제목(`font-bold text-[13px]`) 배치.
- **Input Fields**:
  - **Height**: `h-9` (Compact)
  - **Style**: `bg-slate-50/50 border-slate-200/60 focus:bg-white`
  - **Label**: `text-[12px] font-semibold text-slate-500`
- **Date/Select**: `Popover`나 `Select` 사용 시에도 동일한 높이와 스타일 적용.

### C. 첨부파일 영역 (Attachments)
- **Container**: 점선 테두리 (`border-2 border-dashed border-slate-200 rounded-xl`).
- **Placeholder**: 아이콘 + "클릭하여 파일 업로드" 텍스트.
- **File List card**: `bg-white border border-slate-100 shadow-sm` 스타일의 카드형 리스트.

### D. Footer (Action Area)
- **Style**: `bg-slate-50/50 border-t border-slate-100 p-4`
- **Submit Button**: `bg-gradient-to-r ... text-white shadow-md` (테마색 적용).
- **Cancel Button**: `variant="ghost" text-slate-500`.

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

## 6. 삭제 및 확인 패턴 (Delete & Confirmation Patterns)

데이터 영구 삭제와 같이 되돌릴 수 없는 작업에는 브라우저 기본 알림(`window.confirm`) 사용을 **금지**하며, 시스템 표준 `AlertDialog` 컴포넌트를 사용합니다.

### A. 삭제 확인 다이얼로그 표준
- **Trigger**: 붉은색 텍스트 또는 아이콘(`text-red-600`) 사용.
- **Title**: "OOO 삭제" (예: "출고 내역 삭제")
- **Description**:
  - 1줄: "선택한 항목을 정말 삭제하시겠습니까?"
  - 2줄: "이 작업은 되돌릴 수 없습니다." (경고 문구)
- **Buttons**:
  - **Cancel**: `variant="outline"` (텍스트: "취소")
  - **Action**: `variant="destructive"` (텍스트: "삭제"), 로딩 상태(`Loader2`) 표시 필수.

---

## 7. 참조 구현: 광통신 모듈 표준 (Optical Module Reference)

> [!TIP]
> **Reference Implementation**: `OpticalCables.tsx`, `OpticalCableHistoryDialog.tsx`, `OpticalLogEditDialog.tsx`는 아래 표준의 실제 구현체입니다.

### A. 확장된 다이얼로그 규격 (Wide Layout)
많은 컬럼을 표시해야 하는 이력/로그 조회 화면에 적용합니다.
- **참조**: `OpticalCableHistoryDialog.tsx`
- **Max Width**: `max-w-[1100px]`
- **특징**: 액션 버튼을 헤더 영역(`DialogHeader`)에 통합하여 공간 효율성 극대화.

### B. 상태 기반 행 스타일 (Status Row Colors)
테이블에서 상태(Status)를 명확히 구분하기 위해 **행 전체 배경색**을 사용합니다.
- **참조**: `OpticalCables.tsx` (List), `OpticalCableHistoryDialog.tsx` (History)
- **Color Mapping**:
  - **예약 (Reserved)**: `bg-orange-50/50 hover:bg-orange-100/50`
  - **출고 (Assigned)**: `bg-blue-50/30 hover:bg-blue-50/60`
  - **반납 대기**: `bg-amber-50/50 hover:bg-amber-100/50`
  - **폐기**: `bg-red-50/30`
  - **기본**: `hover:bg-slate-50/50`

### C. 파스텔 톤 액션 버튼 (Pastel Action Buttons)
행의 배경색과 시각적으로 연결되는 **연한 배경(Pastel)** 버튼을 사용합니다. 진한 색상은 피합니다.
- **Style Pattern**: `bg-{color}-50 text-{color}-700 border border-{color}-200 hover:bg-{color}-100`
- **구현 예시**:
  - **예약**: `bg-orange-50 text-orange-700 border-orange-200`
  - **출고**: `bg-blue-50 text-blue-700 border-blue-200`
  - **폐기**: `bg-red-50 text-red-700 border-red-200`
