# Changelog

## v1.2.25 (2026-01-14) - 현장팀 광케이블 보유 현황 UI/UX 개선 및 반납 취소 기능

### ✨ Features (신규 기능)
- **반납 신청 취소 기능**:
  - 현장팀이 반납 신청 후 '반납 대기(pending)' 상태일 때 신청을 취소할 수 있는 기능 추가.
  - 드롭다운 메뉴에 '반납 취소' 옵션 제공.
  - 서버 API (`POST /api/optical-cables/:id/cancel-return`) 구현 및 상태 초기화(`none`) 로직 적용.

### 🎨 UI/UX Improvements
- **현장팀 보유 현황 테이블 스타일 표준화**:
  - 일반 자재 현황(`TeamOutgoing.tsx`)과 광케이블 현황(`FieldOpticalStatus.tsx`)의 행 높이(`h-10`) 및 패딩 스타일 통일.
  - 상태 배지 및 버튼이 있는 셀의 패딩을 최적화(`py-1`)하여 높이 팽창 방지.
  - 텍스트 셀 `truncate` 적용으로 긴 텍스트 처리 개선.
- **대시보드 카드 표시 제한**:
  - 현장팀 카드 목록을 최근 활동순 상위 4개로 제한하여 시인성 확보.
- **상태 표시 직관화**:
  - `assigned` 상태를 "불출"에서 "**보유중**"(파란색)으로 변경하여 의미 명확화.

## v1.2.24 (2026-01-13) - 현장팀 사용 등록 내역 조회 버그 수정

### 🐛 Bug Fixes
- **API**: 누락되었던 `GET /api/material-usage` 엔드포인트를 복구하여 현장팀 사용 등록 내역이 정상적으로 조회되도록 수정.

## v1.2.23 (2026-01-13) - 운영 서버 파일 저장소(Storage) 완전 통합

### 🚀 Major Improvements
- **운영 환경 파일 시스템 구축 (Phase 2 완료)**:
  - **Supabase Storage 연동**: 운영(Production) 서버용 별도 버킷(`attachments`) 생성 및 권한 정책(RLS) 적용 완료.
  - **한글 파일명 완전 지원**: 
    - 업로드 시 서버에서 파일명 Sanitization (특수문자/한글 → 안전한 영문 이름 변환) 자동 적용.
    - 다운로드 시 DB에 저장된 **원래 파일명(Original Name)**으로 복원하여 다운로드되도록 클라이언트 로직 전면 리팩터링.
  - **전역 적용**: 자재(입/출고), 광케이블(입/출고/현장팀), 현장팀 사용등록 등 모든 파일 첨부 구간에 일괄 적용 검증 완료.


## v1.2.22 (2026-01-13) - 광케이블 코드 리팩터링 (Phase 1-3 완료)

### ♻️ Refactoring (코드 구조 개선)

#### Phase 1: Custom Hooks 분리
- **데이터 fetching 훅 통합** (`useOpticalCables.ts`):
  - `useOpticalCables`, `useOpticalLogs`, `useOpticalCableHistory`, `useOpticalCableById` 4개 훅 생성
  - 중복된 쿼리 로직 제거 및 재사용성 향상
- **Mutation 훅 통합** (`useOpticalMutations.ts`):
  - 9개 mutation 훅 생성 (생성, 수정, 삭제, 일괄 삭제, 일괄 업로드, 반납 승인 등)
  - 18개 inline mutation → 9개 재사용 가능 훅으로 통합
- **적용 범위**: `OpticalCables.tsx`, `OpticalIncoming.tsx`, `OpticalOutgoing.tsx`
- **코드 감소**: ~230줄

#### Phase 2: 테이블 컬럼 정의 공통화
- **컬럼 정의 파일 생성** (`optical-table-columns.ts`):
  - `OPTICAL_CABLE_COLUMNS` - 광케이블 메인 테이블용 (19개 컬럼)
  - `OPTICAL_LOG_COLUMNS` - 입고 로그 테이블용 (17개 컬럼)
  - `OPTICAL_OUTGOING_COLUMNS` - 출고 로그 테이블용 (15개 컬럼)
  - `COLUMN_LABELS` - 컬럼 레이블 매핑
- **중복 코드 제거**: 37줄 (OpticalCables 19줄 + OpticalIncoming 18줄)
- **유지보수성**: 컬럼 width 변경 시 한 곳만 수정

#### Phase 3: 필터 로직 통합
- **필터 훅 생성** (`useOpticalFilters.ts`):
  - 범위 필터 (잔량 min/max)
  - 코어 수 필터
  - 상태 필터 (창고/예약/불출/반납)
  - 폐기 포함/제외 토글
  - 활성 필터 관리 (getActiveFilters, removeFilter, resetFilters)
- **적용**: `OpticalCables.tsx`에서 80+줄의 필터 로직을 단일 훅 호출로 대체
- **코드 감소**: 41줄

#### 📊 전체 성과
- **중복 코드 제거**: 308줄
- **재사용 가능한 훅**: 3개 생성 (212줄)
- **순 코드 감소**: 96줄
- **유지보수성**: 대폭 향상 (한 곳 수정 → 모든 페이지 반영)

### ✨ Features (기능 개선)
- **이미지 압축 요약 메시지**: 개별 파일마다 토스트 대신 압축 완료 후 요약 표시
- **광케이블 입고 공사번호 업데이트**: `projectCode`와 `projectName`이 로그에도 동기화되도록 수정
- **사용 드럼 선택 UI 개선**: 드럼 선택 드롭다운에 `[SKT]`, `[SKB]` 사업 구분 표시
- **자동 폐기 처리**: 잔량이 0 이하가 되면 `used_up` 대신 `waste` 상태로 자동 전환
- **중복 등록 방지**: 같은 사업(division) + 제조번호(drumNo) 조합 등록 차단
- **사업 필드 제한**: 광케이블 등록 시 사업 필드를 Select로 변경 (SKT/SKB만 선택 가능)

### 💄 UI/UX Improvements
- **현장팀 보유재고 테이블 행 높이 표준화**: `h-10` → `h-6` (24px)로 변경하여 디자인 가이드 준수

## v1.2.21 (2026-01-13) - 일반자재 사용등록 편의성 및 정합성 개선


### ✨ Features (기능 고도화)
- **일반자재 사용등록 '사업' 필드 자동화**:
  - 자재 선택 시 해당 자재의 소속 사업(SKT/SKB)을 자동으로 식별하여 저장.
  - 기존 모든 데이터가 "SKT"로 하드코딩되어 있던 문제를 해결하고 자재 데이터와 일치하도록 자동화.
- **SKT/SKB 자재 혼합 등록 방지**:
  - 한 번의 등록 시 서로 다른 사업의 자재가 섞이지 않도록 필터링 및 검증 로직 추가.
  - 첫 번째 자재 선택 시 나머지 품목 선택지가 동일 사업 자재로 자동 제한됨.

## v1.2.20 (2026-01-13) - 광케이블 입고 수정 버그 해결 및 UI 폴리싱

### 🐞 Bug Fixes
- **광케이블 입고 첨부파일 수정 버그 해결**:
  - **Backend**: `updateOpticalCable` 시 `opticalCableLogs`의 `attributes`가 동기화되지 않던 문제 해결.
  - **Frontend**: `OpticalIncoming.tsx`에서 다이얼로그 닫힘 시 발생하는 Race Condition 해결.

### 💄 UI/UX Improvements
- **입고 내역 UI 수정**: "입고량" 컬럼에 "품명" 값이 표시되던 오류 수정 및 합계 방식 변경.

## v1.2.19 (2026-01-12) - 자재 사용 등록 UI 개선

### 💄 UI/UX Improvements
- **자재 사용 등록 화면 개선**:
  - 자재 선택 목록에서 각 품목 앞에 `[SKT]`, `[SKB]` 등 사업 구분을 명시하여 식별 편의성 향상.
  - 예: `[SKT] C/L-MUX전용함...`

## v1.2.18 (2026-01-12) - 핫픽스: 첨부파일 미표시 해결

### 🐞 Bug Fixes (Critical)
- **레거시 첨부파일 미표시 문제 해결**:
  - SQL 최적화(`- 'attachment'`) 과정에서 단일 첨부파일(`attachment`) 객체 전체가 삭제되어 파일명 등 메타데이터가 유실되던 문제 수정.
  - 개선된 쿼리: `#- '{attachment,data}'` 연산자를 사용하여 객체 구조는 유지하고 내부의 대용량 `data` 필드만 정밀하게 제거.
  - 영향 범위: 과거에 등록된 모든 자재 입/출고 내역 및 광케이블 로그.

## v1.2.17 (2026-01-12) - 로딩 성능 최적화 및 UX 개선

### ⚡️ Performance (성능 최적화)
- **획기적인 데이터 최적화 (99.99% 감소)**:
  - 목록 조회 시 `attributes` 내부의 대용량 Base64 이미지(`data`) 및 레거시 필드(`attachment`)를 **DB SQL 레벨에서 원천 제거**.
  - ID 48번 레코드 기준: 5MB → 337 Byte로 감소.
  - 영향 범위: 자재 입고/출고/사용 내역, 광케이블 전체 로그.
- **Double Loading 방지**:
  - `FieldOpticalUsage`, `TeamMaterialUsage`에서 팀 정보 로딩 시점 차이로 인한 화면 깜빡임(빈 리스트 → 데이터 리스트) 현상 해결.

### 🐛 Bug Fixes
- **서버 안정성 확보**:
  - `OpticalStorage` 모듈 누락(`getTableColumns`)으로 인한 서버 크래시 해결.

### 📝 Documentation
- **프로젝트 규칙 업데이트**: `PROJECT_RULES.md`에 SQL 레벨 데이터 최적화 원칙(Node.js 레벨 처리 금지) 추가.

## v1.2.16 (2026-01-11) - 광케이블 반납 승인 워크플로우 및 성능 최적화

### ✨ Features (신규 기능)
- **광케이블 반납 승인 프로세스 구현**:
  - 현장팀의 반납 신청 → 관리자 승인 → 실제 반납 처리 워크플로우 도입
  - 반납 신청 시 즉시 처리되지 않고 `returnRequestStatus: 'pending'` 상태로 변경
  - 현장팀 출고현황에 "반납 대기" 배지 표시
  - 광케이블 자재현황 헤더에 "반납 요청 대기 N건" 배지 추가 (총 수량 앞)
  - 이력 관리 다이얼로그에서도 반납 승인/반려 가능
  - 서버 API: `/api/optical-cables/:id/request-return`, `/api/optical-cables/:id/approve-return`

### ⚡️ Performance (성능 최적화)
- **초기 페이지 로딩 속도 대폭 개선**:
  - `FieldOpticalUsage.tsx`에서 사용하지 않는 전체 광케이블 목록 쿼리 제거
  - 필요한 사용 로그만 가져오도록 최적화
  - 수백 개의 케이블 데이터 불필요한 로딩 제거로 초기 진입 속도 향상

### 🐛 Bug Fixes (버그 수정)
- **광케이블 사용 등록 폼 초기화 문제 해결**:
  - 폼 저장 후 다시 열었을 때 이전 데이터가 남아있던 문제 수정
  - `OpticalUsageDialog`에 `key` prop 추가하여 컴포넌트 강제 리마운트
  - `useEffect` 로직 개선으로 신규/수정 모드 구분 명확화

### 🎨 UI/UX Improvements (UI 개선)
- **광케이블 용어 통일**:
  - "드럼 등록" → "케이블 등록"
  - "드럼 재고" → "케이블 재고"
  - "보유 드럼" → "보유 케이블"
  - 드럼으로 입고되지 않는 케이블도 자연스럽게 표현
- **반납 요청 UI 개선**:
  - 반납 요청 대기 배지를 총 수량 앞으로 이동하고 크기 축소
  - 이력 다이얼로그의 반납 승인/반려 버튼을 작고 연한 색상으로 변경

### 🔧 Technical Improvements (기술 개선)
- **쿼리 캐시 무효화 최적화**:
  - 사용 등록 시 특정 케이블의 이력 쿼리도 무효화하여 실시간 동기화
  - `OpticalUsageDialog`의 `onSuccess`에서 `/api/optical-cables/${cableId}/logs` 무효화 추가

## v1.2.15 (2026-01-11) - 광케이블 기능 배포 (운영 비활성화)

### 🔒 Configuration
- **광케이블 관리 모듈 (Hidden)**:
  - 운영 서버 배포는 진행하되, 일반 사용자에게는 기능이 노출되지 않도록 `Feature Flag` 유지.
  - 관리자가 필요 시 환경변수로 활성화 가능.


### 🐛 Bug Fixes
- **광케이블 출고 다이얼로그 스크롤 해결**:
  - 내용이 길어질 경우 저장 버튼이 화면 밖으로 잘리는 문제 수정.
  - 헤더와 푸터는 고정하고 본문 영역에만 스크롤이 생기도록 레이아웃 개선(`flex-col`, `overflow-y-auto` 적용).



### ✨ Features (기능 고도화)
- **다중 첨부파일 완벽 지원**:
  - 일반 자재 입/출고 및 광케이블 출고 시 최대 4개까지 파일 첨부 가능.
  - UI 개선: 드래그 앤 드롭 지원 점선 박스 UI 및 파일 목록 미리보기 적용.
  - 레거시 호환성 유지: 다중 파일(`attachments`) 저장 시 첫 번째 파일을 `attachment` 필드에도 자동 동기화.

- **광케이블 출고 UI 전면 개편**:
  - 기존 단일 파일 업로드만 가능하던 UI를 다중 파일 지원 UI로 업그레이드.
  - 파일 삭제 및 미리보기 기능 추가.

### 🐛 Bug Fixes & Optimization
- **입고 등록 실패(Failed to fetch) 해결**:
  - 원인: 고해상도 이미지 다중 전송 시 Request Body Size Limit(4.5MB) 초과.
  - 해결: 클라이언트 측 이미지 압축 로직 최적화 (Max 5MB → 1MB, Quality 0.8 → 0.7).
  - 적용 범위: 입고(`IncomingDialog`), 출고(`OutgoingDialog`), 광케이블(`OpticalAssignmentDialog`) 전체 적용.

### 📝 Documentation
- `DESIGN_GUIDE.md`: 첨부파일 UI 표준(Popover, Upload Zone) 가이드 추가.
- `PROJECT_RULES.md`: 파일 처리 및 데이터 전송 최적화 정책 신설.

## v1.2.11 (2026-01-10) - 성능 최적화 및 데이터 비용 절감

### ⚡️ Performance (성능 최적화)
- **데이터 전송량 최소화**:
  - `IncomingRecords`, `OpticalCableLogs` API 목록 조회 시 Base64 파일 데이터 제외 처리
  - 목록 조회 시 네트워크 트래픽 90% 이상 절감 효과
- **캐싱 정책 강화**:
  - React Query `staleTime` 5분 → 30분으로 연장
  - 불필요한 서버 재요청 최소화

### 📝 Documentation
- **프로젝트 규칙 업데이트**: `PROJECT_RULES.md`에 '데이터 전송 최적화' 섹션 추가
- **로드맵 현행화**: 페이지네이션 및 저장소 분리 전략 추가

## v1.2.10 (2026-01-09) - 재고 추적 시스템 근본 개선

### 🎯 Critical Fix (중대 버그 수정)
- **재고 부족 오류 근본 해결**:
  - 간헐적으로 발생하던 "재고가 있는데도 '재고 부족' 메시지" 오류 완전히 제거
  - 원인: `getTeamItemStock` 함수가 문자열 매칭(`productName + specification + division`)을 사용하여 미세한 차이(띄어쓰기 등)로 매칭 실패
  - 해결: 재고 계산 로직을 **ID 기반 매핑**(`inventoryItemId`)으로 전환
  - 영향 파일:
    - `server/storage/inventory.ts`: `getTeamItemStock` 함수 시그니처 변경
    - `server/routes/inventory.ts`: POST `/api/material-usage` 엔드포인트 수정
    - `server/storage/interface.ts`: 인터페이스 정의 업데이트

### 📊 Performance Improvements
- **쿼리 성능 향상**: 문자열 비교 → 정수 비교로 전환하여 재고 조회 속도 개선
- **인덱스 활용**: `inventoryItemId` 외래키 인덱스 활용으로 대용량 데이터 환경에서도 빠른 응답 보장

### ♻️ Architecture Improvements
- **데이터 정합성 강화**: ID 기반 참조로 품명 변경 시에도 기존 데이터 추적 가능
- **유지보수성 향상**: 명확한 관계 정의로 코드 가독성 및 안정성 증대

### 📋 Project Standards (프로젝트 표준)
- **NEW RULE**: 모든 자재 관련 로직은 문자열 매핑 대신 `inventoryItemId` 키값 매핑 사용 원칙 확립
- `PROJECT_RULES.md` 업데이트: "엔티티 간 참조는 반드시 ID(외래키)를 사용" 규칙 추가

## v1.2.9 (2026-01-08) - 긴급 핫픽스

### 🐛 버그 수정
- **조직 관리 팀 memberCount 누락**: 백엔드 리팩터링 시 누락된 memberCount 계산 로직 복구
- **E-Type 함체 중복 데이터**: 운영 서버에서 중복 생성된 재고 0 항목 삭제

## v1.2.8 (2026-01-08) - 긴급 핫픽스(Hotfix)
### 🐞 Bug Fixes (Critical)
- **멤버 관리 페이지 오류 수정**:
  - `AdminMembers.tsx`: `joinDate`가 null인 경우 Invalid Date 오류 발생 문제 해결
  - 가입일이 없는 멤버도 정상적으로 표시되도록 수정

### 🔒 Security & Permissions
- **일괄 삭제 권한 강화**:
  - 현장팀 자재 사용 내역 일괄 삭제 기능을 소유자(Owner)만 사용 가능하도록 제한
  - 프론트엔드(`TeamMaterialUsage.tsx`): `canWrite` → `isTenantOwner` 조건으로 변경
  - 백엔드(`server/routes/inventory.ts`): `/api/material-usage/bulk-delete` 엔드포인트에 `requireAdmin` 미들웨어 적용

### ♻️ Refactoring
- **백엔드 모듈화 (Phase 1 완료)**:
  - `server/routes/` 디렉토리로 라우터 분리 (auth, inventory, optical, teams, system)
  - `server/storage/` 디렉토리로 스토리지 레이어 분리 (user, inventory, optical, team)
  - 기존 `server/routes.ts`, `server/auth.ts` 삭제 및 모듈화된 구조로 전환

### ✨ Validation Improvements
- **음수 입력 방지**:
  - `shared/schema.ts`: 모든 수량/금액 필드에 `.min(0)` 조건 추가
  - 프론트엔드: `IncomingDialog`, `OutgoingDialog`, `TeamMaterialUsage`, `OpticalCableFormDialog`, `OpticalCableActionDialog`에 `min="0"` 속성 추가
  - 일괄 업로드: `bulk-configs/*.tsx`에 음수 값 검증 로직 추가

## [v1.2.7] - 2026-01-07
### ✨ Features & Improvements
- **일괄 등록 기능 개선**:
  - 재고 일괄 등록 템플릿 컬럼 정확도 향상: "재고현황", "사무실보유재고", "현장팀보유재고" 컬럼 추가
  - 파일 업로드 전에도 예상 컬럼 헤더 미리보기 제공
  - CSV "사업" 컬럼 값이 `division` 필드에 정확히 매핑되도록 수정
  - 금액 자동 계산: `(사무실보유재고 + 현장팀보유재고) × 단가`로 자동 계산하여 데이터 정합성 향상

### 🐞 Bug Fixes
- **재고 중복 생성 방지**:
  - `syncInventoryItems` 함수에서 TRIM() 처리 추가로 공백 차이로 인한 중복 생성 방지
  - 품명, 규격, 사업 구분 비교 시 정규화 처리 강화
- **입고 삭제 기능 수정**:
  - `syncInventoryItem` 매칭 로직 개선 (Trim 및 Null 처리)
  - 클라이언트 측 삭제 Mutation에 에러 핸들링 추가
- **대시보드 총 금액 표시 오류 수정**:
  - 일괄 등록 시 `totalAmount` 자동 계산 로직 추가
  - 재고 수량 변경 시 금액 자동 재계산

### 🎨 UI/UX Improvements
- **현장팀 자재 사용등록 개선**:
  - `TeamMaterialUsage.tsx`: 불필요한 '일괄 등록' 버튼 제거 및 '직접 등록' 프로세스 단순화
- **개발 환경 개선**:
  - `vite.config.ts`: 로컬 개발 서버에서 버전 정보가 구버전(v1.2.6)으로 표시되던 문제 해결

## [v1.2.6] - 2026-01-07
### ♻️ Refactoring (Code Cleanup)
- **다운로드 로직 리팩터링**:
  - `IncomingRecords.tsx`, `OutgoingRecords.tsx`, `TeamMaterialUsage.tsx`, `OpticalIncoming.tsx`, `OpticalOutgoing.tsx` 등 5개 파일에 산재된 중복 다운로드 코드 제거.
  - `client/src/hooks/useDownload.ts` 공통 훅 생성 및 전면 적용.
  - 다운로드 버튼 클릭 시 최신 데이터를 실시간으로 가져와 처리하도록 로직 통일.

### 🐞 Bug Fixes
- **입고 내역 다이얼로그**:
  - `IncomingBulkUploadDialog` 컴포넌트의 타입 오류(`onClose` prop) 수정.

## [v1.1.7] - 2026-01-05
### 🐞 Bug Fixes (Critical)
- **재고 금액 변동 이슈 해결**:
  - `calculateInventoryStats` 로직에 SQL `TRIM()` 함수 적용으로 공백이 포함된 기존 데이터까지 정확히 합산하도록 개선.
  - 입고, 출고, 자재 사용, 재고 수정 등 모든 데이터 입력 경로에 자동 공백 제거(String Normalization) 로직 적용.
- **출고 일괄 등록 기능 정상화**:
  - 클라이언트 사이드 루프 방식에서 서버 사이드 트랜잭션(`bulkCreateOutgoingRecords`) 방식으로 전환.
  - 일부 항목 실패 시 전체 롤백(All-or-Nothing) 처리로 데이터 정합성 보장.

## [1.1.6] - 2026-01-04
### 🐞 Bug Fixes (Critical)
- **재고 데이터 정합성 확보**:
  - `server/storage.ts`: 자재 사용 내역 조회 시(`getMaterialUsageRecords`) `teamId`와 `teamCategory` 컬럼 누락 문제 해결. 리스트 및 수정 화면에서 팀 정보가 정상적으로 표시됨.
  - `TeamMaterialUsage.tsx`: 사용 내역 등록/수정 시 `teamId`가 누락되거나 공백 문제로 매핑이 끊기는 현상을 방지하기 위해 데이터 전송 로직에 강력한 공백 제거(`trim()`) 및 `teamId` 강제 포함 로직 적용.
  - `TeamOutgoing.tsx`: 현장팀 보유 재고 계산 시 공백 차이로 인해 사용 내역이 차감되지 않는 문제를 해결하기 위해 모든 키 비교 로직에 `trim()` 적용.
- **사용자 경험 개선**:
  - 자재 사용 내역 수정 시, 팀 정보가 있어도 사용자 목록이 비어 보이는 문제 해결 (팀 ID 역추적 로직 추가).
  - 현장팀 재고 목록에서 수량이 음수인 경우(데이터 불일치 등)에도 숨기지 않고 표시하여 관리자가 인지할 수 있도록 개선.

## [1.1.5] - 2026-01-04

### UI/UX Improvements
- **현장팀 페이지(모바일 중심) UI 최적화**: 
  - `TeamOutgoing`, `TeamMaterialUsage`, `FieldOpticalStatus`, `FieldOpticalUsage` 페이지의 테이블 행 높이를 확장하여 모바일 및 태블릿 환경에서의 가독성 개선 (h-6 적용 제외, 기본 높이 사용)
- **일관성 확보**: 현장팀 전용 페이지들의 디자인 스타일 통일

### Fixes
- **광케이블 현장 사용 등록**: 페이지 높이 표준화 및 UI 개선


모든 프로젝트의 주요 변경 사항은 이 문서에 기록됩니다.

## [v1.1.4] - 2026-01-04 (Major UI Overhaul)
### 🎨 UI/UX Improvements
- **전체 테이블 행 높이 표준화**:
  - 모든 테이블의 헤더 높이를 `h-8` (32px)로 통일.
  - 데이터 행 높이를 `h-6` (24px), 패딩 `py-0`으로 표준화.
  - 총 11개 파일 수정 (일반 자재 4개, 광케이블 3개, 현장팀 2개, 관리 메뉴 2개).
  - `DESIGN_GUIDE.md`에 행 높이 표준 추가.

- **광케이블 입출고 내역 UI 개선**:
  - 입고/출고 내역에 "공사번호" (120px), "공사명" (250px) 컬럼 추가.
  - 출고 내역의 출고량 너비 확대 (75px → 90px).
  - 수령자를 팀 이름 대신 사용자 이름으로 표시.
  - 출고량 및 수령자의 진한 글자색 제거 (일반 텍스트로 표시).

- **광케이블 현장팀 페이지 완전 재구성**:
  - `FieldOpticalStatus` (현장 불출 현황):
    - 일반 자재의 `TeamOutgoing`과 동일한 UI로 재작성.
    - 팀별 카드 뷰 추가 (보유 드럼 수 표시).
    - Excel 다운로드 기능 추가.
    - 검색 및 사업/팀 필터 기능.
  - `FieldOpticalUsage` (사용 등록):
    - 일반 자재의 `TeamMaterialUsage`와 동일한 테이블 형식으로 재작성.
    - 사용 내역 목록을 테이블로 표시 (체크박스, 편집/삭제 기능).
    - 등록 다이얼로그 (`OpticalUsageDialog`) 컴포넌트 생성.
    - Excel 다운로드 및 선택 삭제 기능 추가.
    - 컬럼: 사용일, 사업, 팀, 공사명, 구간명, 제조번호, 규격, 설치/폐기, 작업자, 입력자.

### 🗄️ Database
- **광케이블 로그 스키마 확장**:
  - `opticalCableLogs` 테이블에 `projectCode` (TEXT) 필드 추가.
  - `opticalCableLogs` 테이블에 `attributes` (TEXT) 필드 추가 (비고, 첨부파일 등 저장).
  - 마이그레이션 스크립트 (`add-project-code-to-optical-logs.ts`) 실행.

### 🔧 Maintenance
- **날짜 형식 표준화**:
  - 광케이블 데이터의 `receivedDate` 형식을 `YYYY-MM-DD`로 일괄 변환.
  - `normalizeDateFormat` 함수 추가 (`OpticalBulkUploadDialog.tsx`).
  - 마이그레이션 스크립트 (`normalize-optical-dates.ts`) 실행.

## [v1.1.3] - 2026-01-03 (UI Patch)
### 💄 UI Improvements
- **광케이블 컬럼 정리**: 입고/출고 내역에서 내부 식별용 '관리번호' 숨김 처리 및 '드럼번호' 헤더를 '제조번호'로 통일.

## [v1.1.2] - 2026-01-03 (UI Patch)
### 💄 UI Improvements
- **텍스트 오버플로우 처리**: 입/출고 내역 테이블의 '입력자' 컬럼 등에서 텍스트가 셀을 벗어나는 문제를 해결 (말줄임표 및 툴팁 적용).

## [v1.1.1] - 2026-01-03 (Stable Release)
**주요 마일스톤**: 광케이블 자재 관리 기능 완성 및 운영 안정화

### 🚀 Features (기능 추가)
- **광케이블 관리 고도화**:
  - 불출(Assign), 사용(Usage), 반납(Return), 폐기(Waste) 프로세스 통합 구현.
  - 트랜잭션 기반의 상태 변경 및 로그 생성 로직 적용 (`storage.createOpticalCableLog`).
  - 통합 액션 다이얼로그(`OpticalCableActionDialog`)로 사용자 경험 개선.
- **현장팀 관리**:
  - 현장팀 보유 재고 현황(`/team-outgoing`) 페이지에서 팀 이름이 나오지 않던 버그 수정.
  - Vercel Build 스크립트에 DB 마이그레이션 자동화(`db:push`) 추가.

### 🎨 UI/UX Improvements
- **사이드바 스타일 통일**: 광케이블 메뉴 아이콘의 여백을 조정하여 일반 자재 메뉴와 일관성 유지.
- **라우팅 안정성**: `App.tsx`의 라우터 매칭 로직 개선으로 무한 로딩 이슈 해결.

### ⚙️ DevOps
- **릴리즈 체계**: Semantic Versioning (v1.1.1) 도입 및 Git Tagging 적용.
- **배포 전략**: `dev` → `main` 운영 배포 프로세스 정립.

---

## [v0.5.0] - 2026-01-03 (Alpha Release)
**주요 마일스톤**: 일반 자재 관리 기능 운영 배포 및 광케이블 모듈 개발 시작

### 🚀 Features (기능 추가)
- **일반 자재 관리**:
  - 재고(Inventory), 입고(Incoming), 출고(Outgoing) 관리 기능 웹 배포 완료.
  - 현장팀 전용 메뉴 (`TeamOutgoing`, `TeamUse`) 및 간편 UI 구축.
  - 엑셀 업로드/다운로드 기능 지원.
- **광케이블 관리 (Beta)**:
  - 드럼 단위 관리 테이블 및 등록 다이얼로그 구현.
  - Feature Flag (`ENABLE_OPTICAL`) 도입으로 운영 서버 배포 시 기능 숨김 처리 가능.
- **데이터 추적성**:
  - 모든 입/출고 기록에 `created_by` (입력자) 정보 자동 추적 및 테이블 표시.

### ♻️ Refactoring (구조 개선)
- **폴더 구조 재정비**: 사이드바 메뉴 기반으로 `client/src/pages` 하위 폴더 (`general`, `optical`, `field` 등) 재구성.
- **코드/디자인 표준화**: `project_rules.md` (기술 규칙) 및 `design_guide.md` (UI 가이드) 문서 현행화.

### 🔧 Configuration (설정)
- **Vercel 배포 최적화**: 환경변수 (`VITE_ENABLE_OPTICAL`)를 통한 기능 노출 제어 설정.

---

## [Future Roadmap]
- **v1.3.0**: 전자결재 시스템 (자재 청구 승인) 도입.
- **v1.4.0**: 알림 센터(Notification Center) 및 모바일 앱 최적화.
