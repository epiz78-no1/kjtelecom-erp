# Changelog

모든 프로젝트의 주요 변경 사항은 이 문서에 기록됩니다.

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
