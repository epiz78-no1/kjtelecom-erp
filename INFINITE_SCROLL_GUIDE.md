# 무한 스크롤 적용 가이드 (간단 버전)

## 📋 빠른 적용 방법

각 페이지에 무한 스크롤을 적용하려면 다음 3단계만 수행하면 됩니다.

---

## � 3단계 적용법

### 1단계: Import 추가

```typescript
import { useMemo } from 'react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { InfiniteScrollLoader } from '@/components/InfiniteScrollLoader';
```

### 2단계: 무한 스크롤 훅 사용

기존 필터링 코드 아래에 추가:

```typescript
// 기존 코드
const filteredRecords = records.filter(record =>
  record.productName.toLowerCase().includes(searchQuery.toLowerCase())
);

// 추가: 무한 스크롤 적용
const {
  items: displayRecords,
  hasMore,
  isLoading: scrollLoading,
  observerRef
} = useInfiniteScroll(filteredRecords, {
  initialPageSize: 100,
  pageSize: 100
});
```

### 3단계: 렌더링 변경

```typescript
// 기존: filteredRecords.map()
{filteredRecords.map((record) => (...))}

// 변경: displayRecords.map()
{displayRecords.map((record) => (...))}

// 테이블 아래에 로더 추가
<InfiniteScrollLoader
  hasMore={hasMore}
  isLoading={scrollLoading}
  observerRef={observerRef}
  itemCount={displayRecords.length}
  totalCount={filteredRecords.length}
/>
```

---

## 📝 적용 대상 페이지 목록

### ✅ 우선 적용 (데이터 많음)
1. **IncomingRecords.tsx** - 입고 내역
2. **OutgoingRecords.tsx** - 출고 내역
3. **OpticalCables.tsx** - 광케이블
4. **TeamOutgoing.tsx** - 현장팀 출고
5. **FieldOpticalStatus.tsx** - 현장 광케이블

### ⏸️ 나중에 적용 (데이터 적음)
- DemolitionIncoming.tsx
- DemolitionOutgoing.tsx
- OpticalIncoming.tsx
- OpticalOutgoing.tsx

---

## 💡 전체 예시 (IncomingRecords.tsx)

```typescript
export default function IncomingRecords() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: records = [] } = useQuery({
    queryKey: ["/api/incoming-records"],
  });

  // 1. 검색 필터링
  const filteredRecords = useMemo(() => 
    records.filter(record =>
      record.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.projectName?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [records, searchQuery]
  );

  // 2. 무한 스크롤 적용
  const {
    items: displayRecords,
    hasMore,
    isLoading: scrollLoading,
    observerRef
  } = useInfiniteScroll(filteredRecords, {
    initialPageSize: 100,
    pageSize: 100
  });

  return (
    <div>
      {/* 검색 */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="검색..."
      />

      {/* 통계 */}
      <div className="text-sm text-muted-foreground">
        표시 중: {displayRecords.length} / 전체: {filteredRecords.length}
      </div>

      {/* 테이블 */}
      <table>
        <tbody>
          {displayRecords.map(record => (
            <tr key={record.id}>
              <td>{record.productName}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 무한 스크롤 로더 */}
      <InfiniteScrollLoader
        hasMore={hasMore}
        isLoading={scrollLoading}
        observerRef={observerRef}
        itemCount={displayRecords.length}
        totalCount={filteredRecords.length}
      />
    </div>
  );
}
```

---

## ⚠️ 주의사항

1. **검색 기능 유지**
   - `filteredRecords`로 검색 → `displayRecords`로 표시
   - 검색은 전체 데이터에서 수행됨

2. **통계 정보**
   - 총 개수: `filteredRecords.length` 사용
   - 표시 개수: `displayRecords.length` 사용

3. **선택 기능**
   - 체크박스 선택은 `displayRecords`만 가능
   - 전체 선택은 현재 표시된 항목만

---

## 🎯 적용 우선순위

1. **IncomingRecords** (입고 내역) - 가장 많이 사용
2. **OutgoingRecords** (출고 내역) - 가장 많이 사용
3. **OpticalCables** (광케이블) - 데이터 많음
4. **TeamOutgoing** (현장팀 출고)
5. **FieldOpticalStatus** (현장 광케이블)

---

## ✅ 완료 체크리스트

각 페이지 적용 후 확인:
- [ ] 초기 100개 표시됨
- [ ] 스크롤 시 추가 로드됨
- [ ] 검색 시 전체 데이터에서 검색됨
- [ ] 로딩 인디케이터 표시됨
- [ ] 통계 정보 정확함

---

필요하면 각 페이지를 하나씩 적용해드릴 수 있습니다.
어느 페이지부터 시작할까요?
