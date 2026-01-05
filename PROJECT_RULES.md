# Project Rules & Coding Conventions (Current)

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

## 2. 폴더 구조 및 파일 명명 규칙

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
- `routes.ts`: API 엔드포인트 라우팅 (비즈니스 로직 최소화)
- `storage.ts`: DB 접근 및 비즈니스 로직 구현 (Repository Pattern 유사)
- `db.ts`: Drizzle DB 연결 설정

### Shared
- `shared/schema.ts`: DB 스키마 및 Zod 타입 정의 (Frontend/Backend 공용)

---

## 3. 개발 패턴 (Development Patterns)

### A. 데이터 조회 및 변경 (React Query)
- **Fetch**: `useQuery` 훅 사용. Key는 API URL 경로 사용 (e.g., `["/api/inventory"]`).
- **Mutation**: `useMutation` 사용. 성공 시 `queryClient.invalidateQueries` 호출로 데이터 갱신.
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
- 예: `const canWrite = checkPermission("inventory", "write");`

---

## 4. 데이터 추적 규칙 (Audit Trail)
- **원칙**: 모든 `POST`/`PATCH` 요청 시 세션의 `userId`를 기록해야 함.
- **Backend 구현**:
  ```typescript
  // routes.ts
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
  3. **운영 배포 (Production Deployment)**: 개발 서버에서 정상 작동이 확인된 후, **사용자의 승인**을 받아 `main` 브랜치로 병합합니다.
- **에이전트 행동 규칙**:
  - 작업 완료 후 **배포 여부를 먼저 묻지 않습니다**. 사용자가 "커밋해" 또는 "배포해"라고 명시적으로 요청할 때만 Git 커밋 및 푸시를 진행합니다.
  - 작업 완료 시에는 "수정이 완료되었습니다" 정도로만 알리고 대기합니다.

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

## 11. 문서 관리 전략 (Documentation Strategy)
- **ROADMAP.md (누적 관리)**:
  - **역할**: 프로젝트의 거시적 진행 상황(Phase)과 버전별 주요 변경 이력(History)을 누적 기록하는 중앙 관리 대장입니다.
  - **관리**: 주요 마일스톤 달성이나 버전 업데이트 시 내용을 추가하며, 이전 기록을 삭제하지 않고 계속 보존합니다.
- **task.md & walkthrough.md (순환 관리)**:
  - **역할**: 현재 진행 중인 세션의 세부 작업 목록(Checklist)과 작업 상세 보고서(Report)입니다.
  - **관리**: 하나의 작업 세션이 종료되고 그 결과가 `ROADMAP.md`에 반영되면, 다음 작업을 위해 내용을 리셋하거나 새로 작성하여 항상 "현재 작업"에 집중할 수 있도록 합니다.
