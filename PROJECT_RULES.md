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
- **Frontend 표시**: `design_guide.md` 참조.

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
  - `dev` (Development): 개발 및 테스트용 기본 브랜치. Vercel Development(Preview) 환경에 배포됩니다.
  - `main` (Production): 실제 사용자가 사용하는 운영 브랜치. Vercel Production 환경에 배포됩니다.
- **운영 배포 절차 (Production Deployment)**:
  1. 모든 개발 작업은 `dev` 브랜치에서 수행하고 커밋합니다.
  2. **운영 배포(`main` 브랜치로의 병합 및 푸시)**는 반드시 **사용자의 명시적 확인 및 승인**을 받은 후에만 수행합니다.
  3. 에이전트는 운영 배포 전 변경 사항과 영향을 사용자에게 보고해야 합니다.

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
