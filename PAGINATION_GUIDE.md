# 페이지네이션 사용 가이드

## 📋 개요
대량의 데이터를 효율적으로 표시하기 위한 페이지네이션 기능입니다.

---

## 🔧 구성 요소

### 1. 서버 사이드 (`server/lib/pagination.ts`)
- `paginateArray()`: 배열 데이터 페이지네이션
- `parsePaginationParams()`: 쿼리 파라미터 파싱
- `sortData()`: 데이터 정렬

### 2. 클라이언트 사이드 (`client/src/hooks/usePagination.ts`)
- `usePagination()`: 페이지네이션 상태 관리 훅
- `paginateData()`: 클라이언트 데이터 페이지네이션

### 3. UI 컴포넌트 (`client/src/components/PaginationControls.tsx`)
- 페이지 이동 버튼
- 페이지 크기 선택
- 현재 위치 표시

---

## 💻 사용 예시

### 클라이언트 사이드 페이지네이션

```typescript
import { usePagination, paginateData } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/PaginationControls';

function InventoryList() {
  const { data: items } = useQuery({
    queryKey: ['/api/inventory'],
    queryFn: () => fetch('/api/inventory').then(r => r.json())
  });

  const {
    page,
    pageSize,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    setPageSize,
    startIndex,
    endIndex
  } = usePagination(items?.length || 0, 50);

  // 현재 페이지 데이터
  const paginatedItems = paginateData(items || [], page, pageSize);

  return (
    <div>
      {/* 데이터 테이블 */}
      <table>
        {paginatedItems.map(item => (
          <tr key={item.id}>
            <td>{item.productName}</td>
          </tr>
        ))}
      </table>

      {/* 페이지네이션 컨트롤 */}
      <PaginationControls
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalItems={items?.length || 0}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
        startIndex={startIndex}
        endIndex={endIndex}
      />
    </div>
  );
}
```

### 서버 사이드 페이지네이션

```typescript
// server/routes/inventory.ts
import { parsePaginationParams, paginateArray, sortData } from '../lib/pagination.js';

app.get("/api/inventory", requireAuth, requireTenant, async (req, res) => {
  const tenantId = req.session!.tenantId!;
  
  // 페이지네이션 파라미터 파싱
  const paginationParams = parsePaginationParams(req.query);
  
  // 전체 데이터 조회
  let items = await storage.getInventoryItems(tenantId);
  
  // 정렬 적용
  if (paginationParams.sortBy) {
    items = sortData(items, paginationParams.sortBy, paginationParams.sortOrder);
  }
  
  // 페이지네이션 적용
  const result = paginateArray(items, paginationParams);
  
  res.json(result);
});
```

```typescript
// 클라이언트에서 서버 페이지네이션 사용
function InventoryList() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data } = useQuery({
    queryKey: ['/api/inventory', page, pageSize],
    queryFn: () => fetch(`/api/inventory?page=${page}&pageSize=${pageSize}`)
      .then(r => r.json())
  });

  return (
    <div>
      <table>
        {data?.data.map(item => (
          <tr key={item.id}>
            <td>{item.productName}</td>
          </tr>
        ))}
      </table>

      <PaginationControls
        page={data?.pagination.page || 1}
        pageSize={data?.pagination.pageSize || 50}
        totalPages={data?.pagination.totalPages || 1}
        totalItems={data?.pagination.totalItems || 0}
        hasNextPage={data?.pagination.hasNextPage || false}
        hasPreviousPage={data?.pagination.hasPreviousPage || false}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        startIndex={(page - 1) * pageSize}
        endIndex={Math.min(page * pageSize, data?.pagination.totalItems || 0)}
      />
    </div>
  );
}
```

---

## 🎯 언제 사용할까?

### 클라이언트 사이드 페이지네이션
- ✅ 데이터가 1,000개 미만
- ✅ 전체 데이터를 한 번에 로드해도 괜찮음
- ✅ 빠른 페이지 전환이 필요함
- ✅ 오프라인 지원이 필요함

### 서버 사이드 페이지네이션
- ✅ 데이터가 1,000개 이상
- ✅ 초기 로딩 속도가 중요함
- ✅ 메모리 사용량을 줄여야 함
- ✅ 실시간 데이터 업데이트가 필요함

---

## 📝 주요 기능

1. **페이지 이동**
   - 첫 페이지, 이전, 다음, 마지막 페이지
   - 직접 페이지 번호 입력 가능

2. **페이지 크기 조절**
   - 10, 20, 50, 100개 선택 가능
   - 최대 100개로 제한

3. **현재 위치 표시**
   - "1-50 / 전체 500개" 형식
   - 현재 페이지 / 전체 페이지

4. **정렬 지원** (서버 사이드)
   - `sortBy`: 정렬 필드
   - `sortOrder`: asc/desc

---

## 🚀 다음 단계

페이지네이션을 적용할 페이지를 선택해주세요:
1. 재고 관리 (Inventory)
2. 입고 내역 (Incoming Records)
3. 출고 내역 (Outgoing Records)
4. 광케이블 관리 (Optical Cables)
5. 기타 페이지

어느 페이지에 먼저 적용할까요?
