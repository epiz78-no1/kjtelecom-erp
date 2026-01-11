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
  - **배경색 규칙**: 모든 테이블 헤더 셀(`TableHead`)에 `bg-background` 클래스를 적용하여 배경색을 흰색으로 통일합니다. 이는 `sticky` 속성과 함께 사용될 때 헤더 뒤로 콘텐츠가 비치는 것을 방지하고 리스트 배경색과 일치시키기 위함입니다.
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
    - **TableHead (헤더)**: 모든 헤더는 가운데 정렬 (`text-center`)
    - **TableCell (데이터)**:
      - 공사명 컬럼: 왼쪽 정렬 (`text-left`)
      - 숫자 컬럼: 오른쪽 정렬 (`text-right`)
      - 나머지 모든 텍스트 컬럼: 가운데 정렬 (`text-center`)
    - Enum/Badge: 가운데 정렬
  - **입력자 컬럼 (CreatedBy)**:
    - 필수 표시: 입/출고/사용 내역 테이블
    - 포맷: 값이 없으면 공란으로 표시
  - **빈 값 표시 규칙**:
    - 모든 테이블 셀에서 값이 없을 경우 `-` 대신 **공란(빈 문자열)**으로 표시
    - 예: `{value || '-'}` 대신 `{value || ''}` 사용
  - **대시보드 요약 테이블 (Dashboard Summary Table)**:
    - Row Height: `h-10` (Comfortable)
    - Cell Padding: 기본 패딩 유지 (`py-0` 제거)
    - 이는 대시보드에서 가독성을 높이기 위함입니다.
  - **텍스트 오버플로우 처리**:
    - 긴 텍스트가 셀을 넘어갈 경우 `truncate` 클래스를 사용하여 말줄임표(...) 표시
    - 예: `<TableCell className="truncate" title={item.productName}>{item.productName}</TableCell>`
    - 전체 내용 확인이 필요한 경우 `title` 속성 추가 권장

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
- **File Upload (Standard Pattern)**: 
  - **Layout**: `grid-cols-4` (Label 1, Input 3)
  - **Style**: Dashed border box (`border-2 border-dashed border-primary/30`)
  - **Interaction**:
    - `hover:bg-primary/5` effect
    - Click to select files
    - Hide upload button when max limit reached
  - **Features**:
    - Multiple file selection
    - Client-side image compression (`compressImage`)
    - File size limit (10MB) & count limit (4)
    - File list with delete button (`Trash2`)
  ```tsx
  {/* Grid Layout */}
  <div className="grid grid-cols-4 items-start gap-4">
      <Label className="text-right pt-2">첨부파일</Label>
      <div className="col-span-3">
          {/* File Input */}
          <div className="relative">
              <Input type="file" className="hidden" multiple onChange={...} />
              {/* Dashed Upload Button */}
              {count < 4 && (
                  <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                      <Upload className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-primary">
                          파일 선택 ({count}/4) - 이미지, PDF, 엑셀
                      </span>
                  </label>
              )}
          </div>
          {/* File List */}
          <div className="space-y-2 mt-2">
              {files.map(file => (
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                      <span className="truncate">📎 {file.name}</span>
                      <Button variant="ghost" size="sm" onClick={remove}>
                          <Trash2 className="h-4 w-4" />
                      </Button>
                  </div>
              ))}
          </div>
      </div>
  </div>
  ```

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

---

## 8. 첨부파일 UI 표준 (Attachment UI)
- **업로드 UI**:
  - `Input[type="file"]`을 직접 노출하지 않고, 점선 테두리(`border-dashed`) 박스를 사용합니다.
  - 파일 선택 전: "파일 선택 또는 드래그" 문구와 업로드 아이콘(`Upload`, lucide-react) 표시.
  - 파일 선택 후: 회색 박스(`bg-muted/50`) 내에 파일명(`📎 filename`)과 삭제 버튼(`Trash2` red color)을 표시합니다.
  - **다중 업로드**: 최대 4개 제한, 개별 삭제 가능.

- **다운로드 UI (테이블 내)**:
  - **단일 파일**: 아이콘(`Download`) 클릭 시 즉시 다운로드.
  - **다중 파일**: 
    - 표시: `📎(개수)` 형태의 텍스트 또는 뱃지.
    - 상호작용: 클릭 시 `Popover`로 파일 목록 표시.
    - 구현: `client/src/pages/general/OutgoingRecords.tsx` 등의 구현 참조.
    ```tsx
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Paperclip className="h-4 w-4 mr-1" />
          <span>({count})</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent>
         {/* File List */}
      </PopoverContent>
    </Popover>
    ```
