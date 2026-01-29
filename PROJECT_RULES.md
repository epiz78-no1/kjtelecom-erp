# Project Rules & Coding Conventions

> **[!!!!! CRITICAL INSTRUCTION !!!!!]**
> **모든 소통(대화, 주석, 커밋 메시지, 문서)은 반드시 "한국어(Korean)"로 작성해야 합니다.**

이 문서는 현재 구축된 시스템의 실제 코드베이스를 분석하여 도출된 **기술 표준 및 개발 규칙**입니다.

## 1. 기술 스택 (Tech Stack)

### Frontend
- **Framework**: React + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Routing**: `wouter`
- **Data & State**: `@tanstack/react-query`, `AppContext`
- **Icons**: `lucide-react`

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: PostgreSQL (Supabase/Neon)
- **ORM**: Drizzle ORM
- **Validation**: Zod + `drizzle-zod`
- **Authentication**: `express-session` + `connect-pg-simple`

---

## 2. 핵심 개발 원칙

### A. 엔티티 간 참조는 반드시 ID(외래키) 사용

**원칙**: 모든 엔티티 간 관계는 **문자열 매칭 대신 ID(외래키) 기반 매핑**을 사용합니다.

#### 적용 규칙
1. **DB 스키마**: 모든 트랜잭션 테이블은 `inventoryItemId` 외래키 필수
2. **비즈니스 로직**: 재고 계산, 매칭, 필터링은 모두 ID 기반
3. **API 요청**: 프론트엔드는 항상 `inventoryItemId` 전송
4. **Validation**: `inventoryItemId` 필수 체크

---

## 3. 폴더 구조

### Frontend (`client/src`)

```
pages/
├── home/                    # 홈
├── materials/               # 자재관리
│   ├── general/            # 일반자재
│   ├── optical/            # 광케이블
│   ├── demolition/         # 철거자재
│   └── field/              # 현장팀
├── archives/                # 자료실
├── admin/                   # 관리
│   ├── members/
│   ├── organization/
│   ├── usage/
│   └── super/
├── auth/                    # 인증
└── common/                  # 공통
```

### Backend (`server`)
- `routes/`: 도메인별 라우트 모듈
- `storage.ts`: DB 접근 및 비즈니스 로직
- `db.ts`: Drizzle DB 연결

### Shared
- `shared/schema.ts`: DB 스키마 및 Zod 타입 정의

---

## 4. 개발 패턴

### A. 데이터 조회 및 변경 (React Query)
- **Fetch**: `useQuery` 훅 사용, Key는 API URL 경로
- **Mutation**: `useMutation` 사용, 성공 시 `queryClient.invalidateQueries` 호출

### B. 권한 관리
- **사이드바 숨김**: `AppSidebar.tsx`에서 권한에 따라 메뉴 진입점 숨김
- **버튼 레벨 제어**: 페이지 내부의 등록/수정/삭제 버튼에도 `disabled={!canWrite}` 처리

### C. 데이터 전송 최적화
- **원칙**: 목록 조회 API에서는 DB 쿼리 레벨에서 대용량 데이터 제외
- **Node.js 레벨 처리 금지**: 전체 데이터를 가져온 후 필드를 지우는 방식 금지

---

## 5. 파일 업로드/다운로드 규칙

### 필수 훅 사용
- **업로드**: `useFileUpload` 훅
- **다운로드**: `useDownload` 훅

### 저장 방식
- **Supabase Storage**에 직접 저장
- DB에는 **URL만 저장** (Base64 저장 금지)

### 파일 메타데이터 구조
```typescript
{
  "attachments": [{
    "name": "파일.png",
    "storagePath": "1768633946188_0p0qexu79.png",
    "storageUrl": "https://...supabase.co/storage/v1/object/public/..."
  }]
}
```

---

## 6. Git 및 배포 전략

### 브랜치 전략
- `dev`: 개발 및 테스트용 (Vercel Preview)
- `main`: 운영 (Vercel Production)

### 배포 프로세스
1. **로컬 개발**: 모든 수정은 로컬에서 먼저 테스트
2. **개발 배포**: 사용자 요청 시 `dev` 브랜치에 커밋
3. **DB 스키마 검증**: `./scripts/pre-deploy-check.sh` 실행
4. **운영 배포**: 검증 통과 후 `main` 브랜치로 병합

### 긴급 핫픽스
1. `main` 브랜치로 전환
2. 운영 DB로 전환 (`.env.prod` → `.env`)
3. 긴급 수정 및 테스트
4. 개발 DB로 복원
5. 즉시 배포
6. `dev` 브랜치로 역병합

---

## 7. UI/UX 표준

### 테이블 정렬 규칙
- **헤더**: 모든 헤더는 가운데 정렬 (`text-center`)
- **데이터**:
  - 공사명: 왼쪽 정렬 (`text-left`)
  - 숫자: 오른쪽 정렬 (`text-right`)
  - 나머지: 가운데 정렬 (`text-center`)

### 비동기 작업 피드백
- **로딩 표시**: `Loader2` 아이콘 + spin animation
- **버튼 비활성화**: `disabled={isPending}`
- **진행 문구**: "저장 중...", "처리 중..." 표시

### 입력 필드 Placeholder
- **"예:" 또는 "ex:" 접두어 사용 금지**
- 라벨만으로 의미가 명확한 경우 placeholder 생략
- 예외: 날짜 형식(YYYY-MM-DD) 등 필수 가이드만 사용

---

## 8. Division/Category 필드 규칙

### 필드 정의
- **division**: SKT, SKB 등의 사업 구분 (필수)
- **category**: 하위 분류 (SKT/SKB 값 저장 금지)

### 코딩 규칙
```tsx
// ✅ 올바른 사용
<Label>사업 *</Label>
<Select value={formData.division}>
  <SelectItem value="SKT">SKT</SelectItem>
</Select>

// ❌ 잘못된 사용
<Select value={formData.category}>  // category를 사업으로 사용 금지
```

---

## 9. 일괄 등록 기능 표준

### 필수 구현
- **덮어쓰기 (overwrite)**: 기존 데이터 교체 (기본값)
- **이어쓰기 (add)**: 기존 수량에 합산

### UI 구성
```tsx
<RadioGroup value={mode} onValueChange={setMode}>
  <RadioGroupItem value="overwrite" />
  <Label>덮어쓰기 - 기존 데이터 교체</Label>
  
  <RadioGroupItem value="add" />
  <Label>이어쓰기 - 기존 수량에 합산</Label>
</RadioGroup>
```

---

## 10. 데이터 추적 규칙

- **원칙**: 모든 `POST`/`PATCH` 요청 시 `userId` 기록
- **Backend 구현**: `createdBy: req.session.userId` 자동 주입
- **Frontend 표시**: 빈 값은 공란(`""`)으로 표시

---

## 11. 버전 관리

- **형식**: Semantic Versioning (vMajor.Minor.Patch)
- **릴리즈 프로세스**:
  1. `package.json` 버전 업데이트
  2. Git 커밋 및 태그 생성
  3. 태그 푸시

---

## 12. 환경 변수

| 변수명 | 설명 | 설정 위치 |
|--------|------|-----------|
| `DATABASE_URL` | 현재 환경의 DB 주소 | .env / Vercel |
| `DATABASE_URL_PROD` | 스키마 검증용 운영 DB 주소 | .env (Local only) |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | .env |
| `VITE_SUPABASE_ANON_KEY` | Supabase 익명 키 | .env |

---

## 13. 문서 관리 전략

- **ROADMAP.md**: 프로젝트 진행 상황 및 버전별 변경 이력 (누적 관리)
- **task.md & walkthrough.md**: 현재 세션의 작업 목록 및 보고서 (순환 관리)
