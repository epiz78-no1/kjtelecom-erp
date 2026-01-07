# Changelog

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
  - 입고/출고 내역에 "공사코드" (120px), "공사명" (250px) 컬럼 추가.
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
- **v1.2.0**: 광케이블 현장팀 사용 등록 기능 (모바일 최적화).
- **v1.3.0**: 전자결재 시스템 (자재 청구 승인) 도입.
