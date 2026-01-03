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
