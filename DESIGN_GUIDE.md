# Design Guide & UI Patterns (Current)

이 문서는 현재 구축된 시스템(`client/src/pages/general/Inventory.tsx` 등)을 기준으로 한 **표준 UI 가이드라이**입니다. 일관된 사용자 경험을 위해 아래 패턴을 준수해야 합니다.

## 1. 표준 페이지 레이아웃 (Standard Page Layout)

모든 데이터 관리 페이지는 다음 구조를 따릅니다.

### A. 헤더 영역 (Header Area)
- **Title**: `text-2xl font-bold` (e.g., "일반자재 재고현황")
- **Subtitle**: `text-muted-foreground` (e.g., "자재별 재고 수량과 상태를 확인합니다")
- **Action Buttons (우측 상단)**:
  1. **Excel Export**: `variant="outline"` + Green point color
  2. **Add Item**: Primary Button (`Button` component) or Dropdown for multiple actions.
     - `data-testid` 속성 필수 (e.g., `data-testid="button-add-item"`)

### B. 검색 및 필터 영역 (Search & Filter Bar)
- **Search Input**:
  - `relative max-w-sm` Container
  - `<Search />` icon absolute positioned left
  - `pl-10` padding for input
- **Filters**: `<Select>` component with fixed width (`w-[180px]`)
- **Total Count**: Right-aligned text (`text-sm text-muted-foreground`)

### C. 데이터 테이블 (Data Table)
- **Table Container**: `flex-1 rounded-md border overflow-hidden`
- **Table Header**:
  - `sticky top-0 bg-background z-10 shadow-sm`
  - **Resizable Columns**: `useColumnResize` 훅 사용 필수.
    ```tsx
    const { widths, startResizing } = useColumnResize({ productName: 200, ... });
    // ...
    <TableHead style={{ width: widths.productName }}>
      품명 <div onMouseDown={(e) => startResizing("productName", e)} className="..." />
    </TableHead>
    ```
- **Table Body**:
  - Row Height: `h-8` (Compact)
  - Cell Padding: `[&_td]:py-1`
  - Alignment:
    - Text: Left or Center (`text-center` for standard fixed width cols)
    - Number: Right or Center
    - Enum/Badge: Center
  - **입력자 컬럼 (CreatedBy)**:
    - 필수 표시: 입/출고/사용 내역 테이블
    - 포맷: 값이 없으면 `-` 표시

---

## 2. 컴포넌트 사용 가이드 (Components)

### A. 모달/다이얼로그 (Dialogs)
- **Create/Edit**: `<Dialog>` 컴포넌트 사용.
- **Delete Warning**: `<AlertDialog>` 사용 (Red `variant="destructive"` button).
- **Date Picker**: `<Popover>` + `<Calendar mode="single" locale={ko} />` 조합 사용.

### B. 입력 폼 (Forms)
- **Label**: `text-sm font-medium`
- **Input**: `shadcn/ui`의 `<Input />`
- **Validation**: 클라이언트 측 검증 후 `toast`로 피드백.

### C. 피드백 (Toast)
- **Success**: `toast({ title: "성공 메시지" })`
- **Error**: `toast({ title: "실패", variant: "destructive", description: error.message })`
- **Loading**: 버튼 내 `<Loader2 className="animate-spin" />` 사용.

---

## 3. 아이콘 시스템 (Icons)
- 라이브러리: `lucide-react`
- 주요 아이콘:
  - Add: `Plus`
  - Edit: `Pencil`
  - Delete: `Trash2`
  - Search: `Search`
  - Menu: `MoreHorizontal`
  - Export: `Download`
  - Import: `Upload`

---

## 4. 참조 구현 (Reference)
- **표준 테이블 구현**: `client/src/pages/general/Inventory.tsx`
- **Resizable Hook**: `client/src/hooks/useColumnResize.ts`
- **API 호출**: `client/src/lib/queryClient.ts`

---

## 5. 사이드바 메뉴 스타일 (Sidebar Navigation)
- **아이콘 간격**: 사이드바 메뉴(`SidebarMenuSubButton`) 내의 아이콘은 별도의 `margin-right` 클래스를 사용하지 않습니다. (`mr-2` 제거)
  - 텍스트와 아이콘 사이의 간격은 최소화하여 통일감을 줍니다.
- **일관성**: 일반 자재 관리와 광케이블 자재 관리 메뉴의 스타일은 동일해야 합니다.

## 6. 광케이블 액션 UI 패턴 (Optical Cable Actions)
- **액션 다이얼로그**: 불출(Assign), 사용(Usage), 반납(Return), 폐기(Waste)는 단일 통합 다이얼로그(`OpticalCableActionDialog`)를 통해 처리합니다.
- **메뉴 진입**: 테이블 Row의 `DropdownMenu` ("더보기" 아이콘)를 통해 액션에 접근합니다.
- **상태별 필터링**: 현재 상태(`status`)에 따라 가능한 액션만 메뉴에 노출합니다.

---

## 7. 테이블 컬럼 너비 표준 (Table Column Width Standards)
모든 페이지(일반 자재, 광케이블)에서 동일한 의미의 컬럼은 **통일된 너비**를 사용해야 합니다.

### 표준 컬럼 너비 (`useColumnResize` 초기값)
- **checkbox**: `40` - 체크박스 컬럼
- **사업 (division)**: `60` - 사업 주체 구분 (예: SKT, SKB, KT)
- **구분 (category)**: `50` - 자재/업무 유형 (예: 광케이블, 구매, 철거, 이설)
- **날짜 (date, receivedDate)**: `90~100` - 입고일자, 출고일자 등
- **제조사 (manufacturer)**: `80` - 제조사명
- **제조연도 (manufactureYear)**: `70` - 제조연도
- **규격 (spec)**: `100` - 자재 규격
- **코어 (coreCount)**: `50` - 광케이블 코어 수
- **제조번호 (drumNo)**: `120` - 광케이블 드럼/제조번호
- **위치 (location)**: `60` - 보관 위치
- **비고 (remark)**: `60` - 비고란

### 행 높이 표준 (Row Height)
- **테이블 스타일 (Table Style)**: `table-fixed` 클래스 필수 적용.
  - 열 너비를 고정하고 렌더링 성능을 최적화합니다.
- **테이블 헤더 (Header)**: 높이 **`32px`** (`h-8`)
  - 컴팩트하고 일관된 헤더 높이를 유지합니다.
- **테이블 리스트 (Body)**: 높이 **`24px`** (`h-6`)
  - 더욱 컴팩트한 데이터 표시를 위해 24px을 사용합니다.
- **셀 스타일 (Cell Style)**: 
  - 패딩 없음: `[&_td]:py-0`
  - 폰트 크기: 헤더와 본문 모두 `text-sm` 혹은 `text-xs` (상황에 따라)


**중요**: 새로운 페이지를 추가하거나 기존 페이지를 수정할 때, 위 표준 너비와 높이를 준수하여 일관된 UI를 유지합니다.

