# Project Rules & Coding Conventions (Current)

> **[!!!!! CRITICAL INSTRUCTION !!!!!]**
> **모든 소통(대화, 주석, 커밋 메시지, 문서)은 반드시 "한국어(Korean)"로 작성해야 합니다.**
> **All communication must be in Korean.**



이 문서는 현재 구축된 시스템의 실제 코드베이스를 분석하여 도출된 **기술 표준 및 개발 규칙**입니다. 모든 신규 개발은 이 규칙을 준수하여 기존 코드와 일관성을 유지해야 합니다.

## 1. 기술 스택 (Tech Stack)

### Frontend
- **Framework**: React + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui (Components)
- **Routing**: `wouter` (Lightweight router)
- **Data & State**:
  - `@tanstack/react-query`: 서버 상태 관리 및 캐싱 (필수)
  - `AppContext`: 전역 상태 (User, Tenant, Permissions)
- **Icons**: `lucide-react`
- **Utility**: `date-fns` (날짜 처리)

### Backend
- **Runtime**: Node.js
- **Server**: Express.js
- **Database**: PostgreSQL (Supabase/Neon)
- **ORM**: Drizzle ORM (Schema-first approach)
- **Validation**: Zod + `drizzle-zod`
- **Authentication**: `express-session` + `connect-pg-simple`

---

## 2. 핵심 개발 원칙 (Core Development Principles)

### A. 엔티티 간 참조는 반드시 ID(외래키) 사용 ⭐ **NEW**

**원칙**: 모든 엔티티 간 관계 및 자재 관련 로직은 **문자열 매칭 대신 ID(외래키) 기반 매핑**을 사용해야 합니다.

#### 🎯 왜 중요한가?
- **문자열 매칭**은 띄어쓰기, 대소문자, NULL vs "" 등 미세한 차이로 인해 매칭 실패 가능
- **ID 매칭**은 데이터 정합성을 보장하고 성능도 우수 (정수 비교 > 문자열 비교)

#### ❌ 잘못된 예시 (문자열 매칭)
```typescript
// 재고 계산 시 문자열로 매칭
const stock = await db.select()
  .from(outgoingRecords)
  .where(and(
    eq(outgoingRecords.productName, productName),      // ❌ 문자열
    eq(outgoingRecords.specification, specification),  // ❌ NULL != ""
    eq(outgoingRecords.division, division)             // ❌ "SKT " != "SKT"
  ));
```

#### ✅ 올바른 예시 (ID 매칭)
```typescript
// 재고 계산 시 ID로 매칭
const stock = await db.select()
  .from(outgoingRecords)
  .where(and(
    eq(outgoingRecords.tenantId, tenantId),
    eq(outgoingRecords.inventoryItemId, inventoryItemId)  // ✅ ID
  ));
```

#### 📋 적용 규칙

1. **DB 스키마**: 모든 트랜잭션 테이블은 `inventoryItemId` 외래키 필수
   ```typescript
   export const materialUsageRecords = pgTable("material_usage_records", {
     inventoryItemId: integer("inventory_item_id")
       .references(() =\u003e inventoryItems.id),  // ✅ 외래키 설정
     // productName, specification은 참고용으로만 유지
   });
   ```

2. **비즈니스 로직**: 재고 계산, 매칭, 필터링은 모두 ID 기반
   - `getTeamItemStock(tenantId, teamCategory, inventoryItemId)`  ✅
   - `getTeamItemStock(tenantId, teamCategory, productName, spec, div)`  ❌

3. **API 요청**: 프론트엔드는 항상 `inventoryItemId` 전송
   ```typescript
   // ✅ 올바른 API 요청
   const data = {
     inventoryItemId: item.inventoryItemId,  // ✅ ID 전송
     // productName, specification은 표시용
   };
   ```

4. **Validation**: `inventoryItemId` 필수 체크
   ```typescript
   if (!parseResult.data.inventoryItemId) {
     return res.status(400).json({
       error: "inventoryItemId가 필요합니다. 품목을 다시 선택해주세요."
     });
   }
   ```

#### 🔄 마이그레이션 가이드

기존 문자열 매칭 코드를 발견하면:
1. 먼저 DB에 `inventoryItemId`가 제대로 채워져 있는지 확인
2. 함수 시그니처를 ID 기반으로 변경
3. 호출하는 모든 곳도 함께 수정
4. TypeScript 컴파일 에러로 누락 확인

---

## 3. 폴더 구조 및 파일 명명 규칙

### Frontend (`client/src`)
- **Pages**: `/pages/[Category]/[Feature].tsx` (PascalCase)
  - `general/`: 일반 자재
  - `optical/`: 광케이블
  - `field/`: 현장팀
  - `admin/`: 관리자
  - `auth/`: 인증
- **Components**: `/components/[Feature].tsx` or `/components/ui/[shadcn].tsx`
- **Hooks**: `/hooks/use[Feature].ts`

### Backend (`server`)
- `routes/`: 도메인별 라우트 모듈 디렉토리
  - `index.ts`: 메인 라우터 진입점 (모든 모듈 통합)
  - `auth.ts`, `inventory.ts`, `teams.ts`, `optical.ts` 등
- `storage.ts`: DB 접근 및 비즈니스 로직 구현 (추후 서비스 계층으로 분리 예정)
- `db.ts`: Drizzle DB 연결 설정

### Shared
- `shared/schema.ts`: DB 스키마 및 Zod 타입 정의 (Frontend/Backend 공용)

---

## 3. 개발 패턴 (Development Patterns)

### A. 데이터 조회 및 변경 (React Query)
- **Fetch**: `useQuery` 훅 사용. Key는 API URL 경로 사용 (e.g., `["/api/inventory"]`).
- **Mutation**: `useMutation` 사용. 성공 시 `queryClient.invalidateQueries` 호출로 데이터 갱신.
  - **데이터 효율성**: `refetchType: 'active'` 옵션 사용 권장 (현재 활성화된 쿼리만 refetch, 백그라운드 캐시는 유지)
  - **예시**:
    ```typescript
    queryClient.invalidateQueries({ 
        queryKey: ["/api/optical-cables"],
        refetchType: 'active' // 현재 화면에 표시 중인 쿼리만 즉시 refetch
    });
    ```
  - **staleTime 고려**: 프로젝트는 `staleTime: 30분` 설정으로 데이터 사용량 절약. `invalidateQueries`만으로는 즉시 refetch되지 않으므로 `refetchType: 'active'` 필수.
- **API Wrapper**: `lib/queryClient.ts`의 `apiRequest` 함수 반드시 사용 (에러 핸들링 및 JSON 파싱 자동화).

### B. 데이터베이스 스키마 정의 (Drizzle + Zod)
1. `shared/schema.ts`에 `pgTable` 정의.
2. `createInsertSchema`로 Zod 스키마 자동 생성.
3. `apiInsert[Entity]Schema`로 API 요청용 스키마 별도 정의 (필요 시 `omit`이나 `extend` 사용).
4. **필수 공통 컬럼**:
   - `tenantId`: 멀티 테넌트 격리용
   - `createdBy`: 데이터 생성자 추적 (`varchar` references `users.id`)
   - `createdAt`, `updatedAt`: 타임스탬프

### C. 권한 관리 (Context API)
- 페이지/컴포넌트 레벨에서 `useAppContext`의 `checkPermission(resource, action)` 사용하여 접근 제어.
- **필수 구현 규칙**:
  - **사이드바 숨김**: `AppSidebar.tsx`에서 권한에 따라 메뉴 진입점 숨김.
  - **버튼 레벨 제어**: 페이지 내부의 **등록/수정/삭제 버튼**에도 반드시 `disabled={!canWrite}` 처리를 해야 함. (URL 직접 접근 방어 및 Readonly 권한 대응)
  - 예: 광케이블, 안전관리 등 신규 모듈 추가 시에도 이 규칙을 엄격히 적용해야 함.

### D. 데이터 전송 최적화 (Data Transfer Optimization) ⭐ **NEW**
### D. 데이터 전송 최적화 (Data Transfer Optimization) ⭐ **NEW**
- **원칙**: 목록 조회 API(`GET /api/list`)에서는 **반드시 DB 쿼리 레벨(SQL)에서 대용량 데이터(`data`, `attachment`)를 제외**하고 메타데이터만 전송해야 합니다.
- **Node.js 레벨 처리 금지**: `db.select`로 전체 데이터를 가져온 후 Node.js에서 `Map`이나 `delete`로 필드를 지우는 방식은 금지합니다. (메모리 사용량 폭증 및 GC 부하 원인)
- **구현 패턴 (PostgreSQL/Drizzle)**:
  - `jsonb_set`, `jsonb_agg`, `-` 연산자를 사용하여 DB에서 직접 무거운 필드를 제거한 JSON 문자열을 생성합니다.
  - 예시:
    ```typescript
    attributes: sql<string>`(
      CASE 
        WHEN length(${table.attributes}) < 1000 THEN ${table.attributes}::jsonb
        ELSE ${table.attributes}::jsonb - 'data' - 'attachment'
      END
    )`
    ```
- **목적**: 불필요한 네트워크 트래픽(Egress) 방지, Node.js 힙 메모리 보호, 로딩 속도 향상.

### E. 개발 가이드라인 (Development Guidelines)
- **재사용 원칙**: 새로운 UI나 기능을 구현할 때, 프로젝트 내에 유사한 기능이나 디자인이 이미 존재한다면 이를 최대한 활용하고 스타일을 통일합니다. (예: 첨부파일 UI, 테이블 레이아웃 등)

---

## 4. 데이터 추적 규칙 (Audit Trail)
- **원칙**: 모든 `POST`/`PATCH` 요청 시 세션의 `userId`를 기록해야 함.
- **Backend 구현**:
  ```typescript
  // routes/inventory.ts
  const data = await requestSchema.parseAsync(req.body);
  const result = await storage.createItem({
    ...data,
    tenantId: req.session.tenantId,
    createdBy: req.session.userId, // 자동 주입
  });
  ```
- **Frontend 표시**: 
  - 테이블 셀에서 빈 값은 `-` 대신 **공란(빈 문자열)**으로 표시합니다.
  - 예: `{value || '-'}` 대신 `{value || ''}` 사용
  - **텍스트 정렬 규칙**:
    - TableHead (헤더): 모든 헤더는 가운데 정렬 (`text-center`)
    - TableCell (데이터):
      - 공사명 컬럼: 왼쪽 정렬 (`text-left`)
      - 숫자 컬럼: 오른쪽 정렬 (`text-right`)
      - 나머지 모든 텍스트 컬럼: 가운데 정렬 (`text-center`)
  - **첨부파일 UI 표준**:
    - **업로드 UI**:
      - 점선 박스 스타일: `border-2 border-dashed border-primary/30`
      - 호버 효과: `hover:border-primary/50 hover:bg-primary/5`
      - 텍스트: "파일 선택 또는 드래그"
      - 아이콘: `Upload` (lucide-react)
      - 선택된 파일 표시: 회색 배경 박스 (`bg-muted/50`), 파일명, 삭제 버튼

    - **다운로드 UI (테이블 내)**:
      - 텍스트 없이 아이콘만 표시
      - 아이콘: `Download` (lucide-react), 크기 `h-4 w-4`
      - 스타일: `inline-flex items-center justify-center text-primary hover:text-primary/80`
      - 툴팁: `title` 속성에 파일명 표시

  ## 커뮤니케이션 규칙
  1. **언어**: 모든 답변, 주석, 커밋 메시지, 문서 작성 시 **반드시 한국어**를 사용합니다.
  2. **이해하기 쉬운 설명**: 기술적인 내용도 사용자가 이해하기 쉽게 한국어로 풀어서 설명합니다.
      <Upload className="h-5 w-5 text-primary" />
      <span className="text-sm font-medium text-primary">
        {file ? file.name : "파일 선택 또는 드래그"}
      </span>
    </label>
    ```
  - 자세한 내용은 `DESIGN_GUIDE.md` 참조.

---


---

## 4.5 파일 업로드/다운로드 규칙 (File Handling) ⭐ **필수**

> **[!IMPORTANT]**
> 모든 파일 업로드/다운로드는 **반드시** `useFileUpload`와 `useDownload` 훅을 사용해야 합니다.
> 직접 구현하거나 다른 방식을 사용하는 것은 **금지**됩니다.

### A. 필수 훅 사용

**검증 완료**: 2026-01-17 기준, 모든 메뉴(입고, 출고, 사용등록, 광케이블 등)에서 정상 작동 확인됨.

#### 업로드: `useFileUpload` 훅
```typescript
import { useFileUpload } from "@/hooks/useFileUpload";

const { 
  attachments, 
  handleFileSelect, 
  removeAttachment, 
  isUploading 
} = useFileUpload();
```

**특징**:
- 이미지 자동 압축 (용량 절감)
- Supabase Storage에 UUID 파일명으로 저장
- DB에는 원본 파일명 + Storage 경로만 저장 (Base64 저장 금지)
- 업로드 진행 상황 토스트 알림
- 압축 절감량 표시

#### 다운로드: `useDownload` 훅
```typescript
import { useDownload } from "@/hooks/useDownload";

const { downloadFile, downloadAttachment } = useDownload();

// 사용 예시
downloadAttachment(file); // file: { name, storagePath, storageUrl }
```

**특징**:
- Supabase Storage에서 파일 가져오기
- 원본 파일명으로 다운로드 (한글, 공백, 특수문자 지원)
- Blob URL 방식으로 브라우저 호환성 보장
- 다운로드 시작/완료 토스트 알림

### B. 파일 메타데이터 저장 구조

DB의 `attributes` JSONB 필드에 다음 구조로 저장:

```typescript
{
  "attachments": [
    {
      "name": "스크린샷 2026-01-17 15.31.12.png",  // 원본 파일명
      "storagePath": "1768633946188_0p0qexu79.png", // UUID 파일명
      "storageUrl": "https://...supabase.co/storage/v1/object/public/attachments/1768633946188_0p0qexu79.png",
      "size": 169847,
      "type": "image/png",
      "isCompressed": true,
      "originalSize": 250000,
      "compressedSize": 169847
    }
  ]
}
```

**중요**: `data` 필드(Base64)는 절대 저장하지 않습니다. Storage URL만 사용합니다.

### C. 스토리지 구조

- **Provider**: Supabase Storage
- **Bucket**: `attachments` (기본)
- **파일명 규칙**: `{timestamp}_{randomId}.{ext}` (예: `1768633946188_0p0qexu79.png`)
- **경로**: 플랫 구조 (폴더 없음)

### D. 구현 체크리스트

새로운 파일 업로드/다운로드 기능 추가 시:

- [ ] `useFileUpload` 훅 import 및 사용
- [ ] `useDownload` 훅 import 및 사용  
- [ ] DB 스키마의 `attributes` 필드가 JSONB 타입인지 확인
- [ ] 업로드 시 `attachments` 배열 구조로 저장
- [ ] 다운로드 시 `downloadAttachment(file)` 호출
- [ ] Base64 데이터를 DB에 저장하지 않는지 확인

---

## 5. 트랜잭션 및 로직 통합 패턴 (Transaction Patterns)
- **상태 변경과 이력 생성의 원자성**: `opticalCables`와 같은 자산의 상태 변경 시, 반드시 상태 업데이트와 로그 생성을 하나의 트랜잭션으로 묶어야 합니다.
  - 패턴: `storage.createOpticalCableLog` 내부에서 `db.transaction` 사용.
  - 개별 메서드(`updateStatus`, `createLog`) 분리를 지양하고, 비즈니스 로직 단위의 메서드(`createLog` 하나로 통합)를 사용합니다.

## 6. 기능 플래그 (Feature Flags)
- **목적**: 미완성 기능을 운영 환경에 노출하지 않고 배포하기 위함.
- **구현**: `client/src/lib/constants.ts`의 `FEATURE_FLAGS` 객체 사용.
- **환경 변수**: Vercel의 환경 변수(`VITE_ENABLE_OPTICAL`)를 통해 제어. (Local: Always True, Prod: False)
- **배포 프로세스**: Feature Flag 변경 후 반드시 **Redeploy** 해야 적용됨.

---

## 7. Git 및 배포 전략 (Git & Deployment Rules)
- **브랜치 전략 (Branch Strategy)**:
  - `dev` (Development): 개발 및 테스트용 브랜치. Vercel Development(Preview) 환경.
  - `main` (Production): 운영 브랜치. Vercel Production 환경.
- **배포 프로세스 (Strict Workflow)**:
  1. **로컬 개발 (Local First)**: 모든 수정 사항은 로컬 환경에서 먼저 적용하고 테스트합니다.
  2. **개발 배포 (Development Deployment)**: 사용자의 **명시적 요청(커밋 해달라는 요청)**이 있을 때만 `dev` 브랜치에 커밋 및 푸시합니다.
  3. **개발 서버 테스트**: 개발 서버에서 정상 작동을 확인합니다.
  4. **DB 스키마 검증 (Schema Verification)**: 운영 배포 전 **반드시** `./scripts/pre-deploy-check.sh`를 실행하여 개발/운영 DB 스키마 일치 여부를 확인합니다.
     - 검증 실패 시 운영 DB에 마이그레이션 적용 후 재검증
     - 검증 통과 시에만 운영 배포 진행
  5. **운영 배포 (Production Deployment)**: 개발 서버에서 정상 작동이 확인되고 DB 스키마 검증을 통과한 후, **사용자의 승인**을 받아 `main` 브랜치로 병합합니다.

- **긴급 핫픽스 프로세스 (Hotfix Workflow)**:
  
  **⚠️ 핫픽스 시작 전 필독:**
  - 운영 DB에 직접 연결하여 테스트합니다.
  - 대량 데이터 수정 작업은 절대 금지!
  - 테스트 후 반드시 개발 DB로 복원!
  
  **단계별 프로세스:**
  
  1. **작업 중인 내용 보관**: dev 브랜치에서 개발 중이라면 먼저 커밋하거나 stash합니다.
     ```bash
     git add .
     git commit -m "WIP: 개발 중"
     # 또는
     git stash
     ```
  
  2. **main 브랜치로 전환**: 원격 최신 상태로 업데이트합니다.
     ```bash
     git checkout main
     git pull origin main
     ```
  
  3. **운영 DB로 전환** (핫픽스 테스트용):
     ```bash
     cp .env .env.backup
     cp .env.prod .env
     ```
     ⚠️ **주의**: 이제 운영 DB에 연결됩니다!
  
  4. **긴급 수정 및 로컬 테스트**:
     ```bash
     npm run dev
     # 로컬에서 운영 DB 데이터로 테스트
     ```
     ⚠️ **주의**: 
     - 읽기 위주 테스트
     - 최소한의 쓰기만 수행
     - 대량 데이터 변경 절대 금지
  
  5. **개발 DB로 복원** (테스트 완료 후 즉시):
     ```bash
     cp .env.backup .env
     ```
  
  6. **즉시 배포**:
     ```bash
     git add .
     git commit -m "hotfix: [긴급 수정 내용]"
     git push origin main
     ```
  
  7. **역병합 (Backport)**: 배포 완료 후 **반드시** `dev` 브랜치로 역병합하여 동기화합니다.
     ```bash
     git checkout dev
     git merge main  # 충돌 발생 시 핫픽스 내용 우선
     git push origin dev
     git checkout main
     ```
  
  8. **버전 관리**: 핫픽스는 Patch 버전을 올립니다 (예: v1.2.8 → v1.2.9).
  
  **주의사항**:
  - 핫픽스는 **main의 최신 커밋에서 시작**해야 합니다.
  - dev의 미완성 개발 내용이 main에 들어가면 안 됩니다.
  - 역병합 시 충돌이 발생하면 **핫픽스 내용을 우선**하되, dev의 개발 내용도 보존합니다.
  - **운영 DB 테스트는 신중하게!** 테스트 후 반드시 `.env` 복원 확인!

- **에이전트 행동 규칙**:
  - 작업 완료 후 **배포 여부를 먼저 묻지 않습니다**. 사용자가 "커밋해" 또는 "배포해"라고 명시적으로 요청할 때만 Git 커밋 및 푸시를 진행합니다.
  - 작업 완료 시에는 "수정이 완료되었습니다" 정도로만 알리고 대기합니다.
  - **운영 배포 시 DB 스키마 검증은 필수**이며, 검증 없이 배포하지 않습니다.
  - **긴급 핫픽스는 예외**로, 스키마 검증 없이 즉시 배포 가능하지만 반드시 dev로 역병합해야 합니다.

---

## 8. 버전 관리 (Versioning Strategy)
- **형식**: Semantic Versioning (vMajor.Minor.Patch)
  - **Major**: 호환되지 않는 대규모 변경.
  - **Minor**: 하위 호환성을 유지하는 신규 기능 추가. (예: 광케이블 관리 기능)
  - **Patch**: 기존 기능의 버그 수정. (예: 라우팅 오류 수정)
- **릴리즈 프로세스**:
  1. `package.json`의 `version` 업데이트.
  2. Git 커밋: `git commit -m "chore: bump version to vX.Y.Z"`
  3. Git 태그 생성: `git tag vX.Y.Z`
  4. 태그 푸시: `git push origin vX.Y.Z` (이 시점의 코드가 릴리즈 버전이 됨)

## 9. 데이터 갱신 및 UI 동기화 (Data Refresh & UI Sync)
- **쿼리 무효화 필수**: 데이터 생성(Create), 수정(Update), 삭제(Delete) Mutation 성공 시(`onSuccess`), 반드시 관련 `queryKey`를 `invalidateQueries` 하여 UI가 즉시 최신 상태를 반영하도록 합니다. 예: 로그 생성 시 로그 목록 쿼리 무효화.

## 10. UI/UX 표준 (UI/UX Standards)
- **첨부파일 업로드 UI**:
  - `Input[type="file"]`을 직접 노출하지 않고, 점선 테두리(`border-dashed`) 박스를 사용하여 드래그 앤 드롭 영역임을 명시합니다.
  - 파일 선택 전: "파일 선택 또는 드래그" 문구와 업로드 아이콘(`Upload`, lucide-react) 표시.
  - 파일 선택 후: 회색 박스(`bg-muted/50`) 내에 파일명(`📎 filename`)과 삭제 버튼(`Trash2`, lucide-react, red color)을 표시합니다.
- **데이터 식별 UI (Data Identification)**:
  - 드롭다운(ComboBox, Select) 및 선택된 값에는 대상의 핵심 식별 정보(예: `[사업] 제조번호`)를 반드시 포함합니다.
  - 예: 단순히 `2013`만 표시하지 않고 `[SKT] 2013` 형태로 표시하여 중복이나 혼동을 방지합니다.
- **텍스트 말줄임 처리 (Text Truncation)**:
  - 테이블 내 긴 텍스트(공사명, 품명, 비고 등)는 `truncate` 클래스를 사용하여 말줄임표(...)로 표시합니다.
  - 마우스 오버 시 전체 내용을 확인할 수 있도록 `title` 속성을 반드시 제공해야 합니다.
  - **비동기 작업 피드백 (Async Feedback) ⭐ NEW**:
    - **로딩 표시**: 데이터 저장, 삭제, 일괄 등록 등 시간이 소요되는 작업 시 반드시 **로딩 인디케이터**(`Loader2`, spin animation)를 표시해야 합니다.
    - **장애자 처리**: 작업이 진행 중일 때(isPending) 버튼을 **비활성화(disabled)** 하여 중복 클릭을 방지해야 합니다.
    - **진행 문구**: "저장 중...", "처리 중..." 등 현재 상태를 알 수 있는 텍스트를 함께 표시합니다.
    - **다이얼로그 제어**: 비동기 작업 성공(`onSuccess`) 시에만 다이얼로그를 닫아야 하며, 진행 중에는 닫히지 않도록 합니다.

- **테이블 UI 표준 (Table UI)**:
  - **컬럼 리사이징 (Column Resizing)**:
    - 모든 주요 데이터 테이블은 `useColumnResize` 훅을 사용하여 사용자가 컬럼 너비를 조정할 수 있어야 합니다.
    - 리사이즈 핸들러를 `TableHead`에 포함하여 드래그로 너비를 조절합니다.
    - 너비 설정은 로컬 스토리지에 저장되어 유지됩니다.

  - **입력 필드 Placeholder 규칙 (Input Placeholder Rule)**:
    - **"예:" 또는 "ex:" 접두어 사용 금지**: "예: PJ-001"과 같은 형식의 placeholder는 사용하지 않습니다.
    - **Placeholder 생략 권장**: 라벨(Label)만으로 의미가 명확한 경우 placeholder를 삭제하여 UI를 간결하게 유지합니다.
    - **예외**: 날짜 형식(YYYY-MM-DD) 등 입력 포맷 가이드가 반드시 필요한 경우에만 제한적으로 사용합니다.

  - **테이블 행 액션 (Table Row Actions)**:
    - **더보기 메뉴 (Ellipsis Menu)**: 테이블 행의 수정/삭제 등 액션은 `...` 아이콘(`MoreHorizontal`)을 사용한 `DropdownMenu`로 제공해야 합니다.
    - **공간 절약**: 개별 버튼을 나열하는 것보다 공간을 절약하고 깔끔한 UI를 제공합니다.

## 11. 문서 관리 전략 (Documentation Strategy)
- **ROADMAP.md (누적 관리)**:
  - **역할**: 프로젝트의 거시적 진행 상황(Phase)과 버전별 주요 변경 이력(History)을 누적 기록하는 중앙 관리 대장입니다.
  - **관리**: 주요 마일스톤 달성이나 버전 업데이트 시 내용을 추가하며, 이전 기록을 삭제하지 않고 계속 보존합니다.
- **task.md & walkthrough.md (순환 관리)**:
  - **역할**: 현재 진행 중인 세션의 세부 작업 목록(Checklist)과 작업 상세 보고서(Report)입니다.
  - **관리**: 하나의 작업 세션이 종료되고 그 결과가 `ROADMAP.md`에 반영되면, 다음 작업을 위해 내용을 리셋하거나 새로 작성하여 항상 "현재 작업"에 집중할 수 있도록 합니다.

---

## 12. 일괄 등록 기능 표준 (Bulk Upload Standard)

**핵심 원칙**: 모든 일괄 등록(Bulk Upload) 기능은 **반드시** 덮어쓰기/이어쓰기 모드를 제공해야 합니다.

### 필수 구현 사항

#### 1. 모드 선택 기능
- **덮어쓰기 (overwrite)** - 기본값
  - 기존 데이터를 새 데이터로 완전히 교체
  - 동일한 키(예: 품명+규격+사업)를 가진 기존 데이터 삭제 후 새 데이터 삽입
  
- **이어쓰기 (add)**
  - 기존 수량에 새 수량을 합산
  - 동일한 키를 가진 데이터가 있으면 수량만 증가

#### 2. UI 구성 (Frontend)
```tsx
// State
const [mode, setMode] = useState<"overwrite" | "add">("overwrite");

// UI (파일 업로드 영역 아래에 배치)
<RadioGroup value={mode} onValueChange={(v) => setMode(v as "overwrite" | "add")}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="overwrite" id="mode-overwrite" />
    <Label>덮어쓰기 (기본) - 기존 데이터 교체</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="add" id="mode-add" />
    <Label>이어쓰기 (추가) - 기존 수량에 합산</Label>
  </div>
</RadioGroup>

// onUpload 호출 시 mode 전달
onUpload(parsedData, mode);
```

#### 3. API 인터페이스
```typescript
// Frontend → Backend
await apiRequest("POST", "/api/xxx/bulk", { 
  items: parsedData,
  mode: mode  // 'overwrite' | 'add'
});

// Backend
app.post("/api/xxx/bulk", requireAuth, requireTenant, async (req, res) => {
  const { items, mode } = req.body;
  // mode에 따라 다른 로직 수행
});
```

#### 4. 적용 대상
- ✅ 일반자재 재고현황 일괄 등록
- ✅ 입고 내역 일괄 등록
- ✅ 출고 내역 일괄 등록
- ✅ 광케이블 입고 일괄 등록
- 🔮 향후 추가될 모든 일괄 등록 기능

**예외**: 로그성 데이터 등 덮어쓰기가 불가능한 경우에만 예외를 허용하며, 코드 주석으로 이유를 명시해야 합니다.

---

## 13. Division/Category 필드 사용 규칙

**핵심 원칙**: 사업 구분은 `division` 필드를 사용하고, `category`는 하위 분류에만 사용합니다.

### 필드 정의

#### division (사업)
- **용도**: SKT, SKB 등의 사업 구분
- **타입**: `text` (DB), `string` (TypeScript)
- **필수**: 대부분의 테이블에서 필수 (`notNull().default("SKT")`)
- **사용 위치**: 
  - `inventoryItems.division`
  - `incomingRecords.division`
  - `outgoingRecords.division`
  - `materialUsageRecords.division`

#### category (카테고리)
- **용도**: 하위 분류 (예: 광케이블 시스템에서 "광케이블/철거/구매" 등)
- **타입**: `text` (DB), `string` (TypeScript)
- **사용 제한**: 
  - ❌ SKT/SKB 값 저장 금지
  - ✅ 실제 카테고리 값만 저장
- **사용 위치**:
  - `opticalCables.category` (광케이블/철거/구매)
  - 일반 자재에서는 사용하지 않음

### 코딩 규칙

#### 1. UI 라벨
```tsx
// ✅ 올바른 사용
<Label>사업 *</Label>
<Select value={formData.division}>
  <SelectItem value="SKT">SKT</SelectItem>
  <SelectItem value="SKB">SKB</SelectItem>
</Select>

// ❌ 잘못된 사용
<Label>사업 *</Label>
<Select value={formData.category}>  // category를 사업으로 사용 금지
```

#### 2. API 요청
```typescript
// ✅ 올바른 사용
const payload = {
  division: data.division,  // 사업
  // category는 필요한 경우에만 포함
};

// ❌ 잘못된 사용
const payload = {
  division: data.division,
  category: data.category,  // category에 SKT/SKB 저장 금지
};
```

#### 3. 필터링
```typescript
// ✅ 올바른 사용 - division으로 필터링
const filtered = items.filter(item => item.division === selectedDivision);

// ❌ 잘못된 사용 - category로 사업 필터링
const filtered = items.filter(item => item.category === selectedDivision);
```

### 마이그레이션 가이드

기존 코드에서 `category`를 사업 구분으로 사용하고 있다면:

1. **State 변수명 변경**:
   ```typescript
   // Before
   const [formData, setFormData] = useState({
     category: "SKT",  // ❌
   });
   
   // After
   const [formData, setFormData] = useState({
     division: "SKT",  // ✅
   });
   ```

2. **API 페이로드 수정**:
   ```typescript
   // Before
   category: data.category,  // ❌
   
   // After
   division: data.division,  // ✅
   ```

3. **DB 데이터 정리** (필요시):
   - `category` 컬럼에 SKT/SKB 값이 있다면 `division`으로 이동
   - `category`는 실제 카테고리 값만 유지

### 예외 사항

**광케이블 시스템**에서는 `category`를 "구분" 필드로 사용:
- 값: "광케이블", "철거", "구매"
- 이 경우 `division`은 여전히 사업 구분(SKT/SKB)으로 사용

---

## 14. 시스템 아키텍처 및 배포 환경 (System Architecture & Deployment)

### 시스템 구성도 (System Architecture)

```mermaid
graph TD
    subgraph Local [Local Environment]
        LocalApp[Local Application] -- uses --> EnvLocal[.env]
        EnvLocal -- defines --> DB_URL_Local[DATABASE_URL]
        LocalApp -- connects to --> DevDB
        
        CheckScript[scripts/pre-deploy-check.sh] -- verified by --> EnvLocal
        CheckScript -- compares schema --> DevDB
        CheckScript -- compares schema --> ProdDB
    end

    subgraph Dev [Development Deployment (Vercel-Preview/Dev)]
        DevApp[Dev Application] -- uses --> EnvDev[Vercel Env]
        EnvDev -- defines --> DB_URL_Dev[DATABASE_URL]
        DevApp -- connects to --> DevDB[Supabase DEV DB]
    end

    subgraph Prod [Production Deployment (Vercel-Prod)]
        ProdApp[Production Application] -- uses --> EnvProd[Vercel Env]
        EnvProd -- defines --> DB_URL_Prod[DATABASE_URL]
        ProdApp -- connects to --> ProdDB[Supabase PROD DB]
    end

    style DevDB fill:#e1f5fe,stroke:#01579b
    style ProdDB fill:#ffebee,stroke:#b71c1c
    style CheckScript fill:#fff9c4,stroke:#fbc02d
```

### 데이터베이스 환경 분리 전략
- **Local / Development**: 동일한 **Supabase DEV 데이터베이스**를 공유하여 사용합니다. 이는 개발 속도를 높이고 스키마 변경 사항을 즉시 확인하기 위함입니다.
- **Production**: 독립된 **Supabase PROD 데이터베이스**를 사용합니다. 운영 데이터의 안전성을 보장하기 위해 개발 환경과 완벽히 격리됩니다.

### 주요 환경 변수 (Environment Variables)

| 변수명 | 설명 | 설정 위치 (.env / Vercel) |
| :--- | :--- | :--- |
| **`DATABASE_URL`** | **현재 실행 중인 환경**이 연결할 데이터베이스 주소입니다.<br>- 로컬/Dev 환경: DEV DB 주소<br>- Prod 환경: PROD DB 주소 | .env (Local)<br>Vercel Project Settings (Dev/Prod) |
| **`DATABASE_URL_PROD`** | **스키마 검증용** 운영 데이터베이스 주소입니다.<br>애플리케이션 런타임에는 사용되지 않으며, 오직 배포 전 스크립트(`pre-deploy-check.sh`)에서 개발 DB와 운영 DB의 스키마 일치를 확인하기 위해 사용됩니다. | .env (Local only) |
| **`APP_VERSION`** | 애플리케이션 버전 (예: `v1.2.2`). `package.json`에서 자동 주입됩니다. | Vercel Project Settings (선택사항) |

### 배포 전 검증 절차 (Pre-deployment Verification)
1. 로컬 환경의 `.env` 파일에 `DATABASE_URL`(Dev)과 `DATABASE_URL_PROD`(Prod)가 모두 설정되어 있어야 합니다.
2. `scripts/pre-deploy-check.sh` 스크립트는 이 두 데이터베이스에 접속하여 테이블 스키마(hash)를 비교합니다.
3. 스키마가 일치하지 않으면 배포가 중단됩니다. 이 경우, 운영 DB에 마이그레이션을 적용(`drizzle-kit push` 등)하여 스키마를 동기화한 후 재시도해야 합니다.


## 16. 파일 처리 및 저장소 규칙 (File Handling & Storage) ⭐ **UPDATED**

### A. 저장 방식 (Storage Strategy)

**원칙**: 모든 첨부파일은 **Supabase Storage**에 직접 저장하고, DB에는 **URL만 저장**합니다.

#### 🎯 왜 Supabase Storage를 사용하는가?
- ✅ **효율성**: Base64 인코딩 불필요 (파일 크기 33% 감소)
- ✅ **성능**: 서버 부하 감소, 네트워크 전송량 최소화
- ✅ **확장성**: 대용량 파일 처리 용이
- ✅ **직접 접근**: 공개 URL로 즉시 다운로드 가능

#### ❌ 기존 방식 (Deprecated)
```typescript
// ❌ Base64로 DB에 저장 (사용 금지)
{
  "attachments": [
    {
      "name": "파일.jpg",
      "data": "data:image/jpeg;base64,/9j/4AAQ..." // ❌ 파일 크기 33% 증가
    }
  ]
}
```

#### ✅ 새로운 방식 (Required)
```typescript
// ✅ Supabase Storage URL만 DB에 저장
{
  "attachments": [
    {
      "name": "파일.jpg",
      "storageUrl": "https://xxx.supabase.co/storage/v1/object/public/attachments/...",
      "storagePath": "attachments/1234567890_파일.jpg"
    }
  ]
}
```

### B. 프론트엔드 구현 (Frontend Implementation)

#### 1. Supabase Client 설정
```typescript
// client/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### 2. 파일 업로드 유틸리티
```typescript
// client/src/lib/storage.ts
import { supabase } from './supabase';

export async function uploadFileToStorage(
  file: File,
  bucket: string = 'attachments'
): Promise<{ storageUrl: string; storagePath: string }> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${bucket}/${timestamp}_${safeName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw new Error(`업로드 실패: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    storageUrl: publicUrl,
    storagePath: data.path
  };
}
```

#### 3. 사용 예시
```typescript
// 파일 업로드
const handleFileUpload = async (file: File) => {
  try {
    const { storageUrl, storagePath } = await uploadFileToStorage(file);
    
    setFormData({
      ...formData,
      attachments: [
        ...formData.attachments,
        {
          name: file.name,
          storageUrl,
          storagePath
        }
      ]
    });
  } catch (error) {
    toast({ title: "업로드 실패", variant: "destructive" });
  }
};

// 다운로드 (URL 직접 접근)
<a href={attachment.storageUrl} download={attachment.name}>
  다운로드
</a>
```

### C. 백엔드 처리 (Backend Handling)

#### 1. 데이터 저장
```typescript
// 프론트엔드에서 이미 업로드된 파일 정보를 받아 저장
app.post("/api/demolition-materials", async (req, res) => {
  const { attributes } = req.body;
  
  // attributes에는 이미 storageUrl이 포함되어 있음
  // 별도 처리 불필요, 그대로 DB에 저장
  await storage.createDemolitionMaterial({
    ...req.body,
    attributes: JSON.stringify(attributes)
  });
});
```

#### 2. 목록 조회 최적화
```typescript
// 목록 조회 시 attachments는 메타데이터만 포함 (data 필드 없음)
// storageUrl만 있으므로 추가 최적화 불필요
```

### D. 환경 변수 설정 (Environment Variables)

#### 필수 환경 변수
```bash
# .env (프론트엔드)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# .env (백엔드 - 기존)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### E. 마이그레이션 가이드 (Migration Guide)

#### 기존 Base64 데이터 마이그레이션
```typescript
// scripts/migrate-base64-to-storage.ts
// 운영 서버 배포 시 실행할 마이그레이션 스크립트
// 1. 기존 attributes에서 Base64 데이터 추출
// 2. Supabase Storage에 업로드
// 3. storageUrl로 업데이트
```

#### 호환성 유지
- **읽기**: 기존 Base64 데이터와 새로운 storageUrl 모두 지원
- **쓰기**: 새로운 데이터는 무조건 storageUrl 사용
- **마이그레이션**: 운영 서버 배포 시 일괄 변환

### F. 보안 및 권한 (Security & Permissions)

#### Supabase Storage 정책 (RLS Policies)
```sql
-- attachments 버킷 정책
-- 1. 모든 사용자 읽기 가능 (공개)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

-- 2. 인증된 사용자만 업로드 가능
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

-- 3. 본인이 업로드한 파일만 삭제 가능
CREATE POLICY "Owner Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'attachments' AND auth.uid() = owner);
```

### G. 체크리스트 (Checklist)

신규 첨부파일 기능 구현 시:
- [ ] `uploadFileToStorage` 유틸리티 사용
- [ ] `storageUrl`, `storagePath` 저장
- [ ] 다운로드는 URL 직접 접근
- [ ] Base64 인코딩 사용 금지
- [ ] 환경 변수 설정 확인

