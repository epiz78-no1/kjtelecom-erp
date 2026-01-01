
# 🏗️ 개발 및 배포 환경 DB 분리 가이드

Supabase의 개발(Development) 데이터베이스와 운영(Production/Publish) 데이터베이스를 분리하는 방법입니다.

## 1. 개요
현재 Vercel 배포 준비를 위해 애플리케이션 코드를 수정했습니다.
- **세션 저장소**: 파일 시스템 → PostgreSQL DB (`connect-pg-simple` 사용)
- **배포 설정**: `vercel.json` 및 `api/index.ts` 추가

## 2. DB 분리 전략
코드는 동일하며, **환경 변수(`DATABASE_URL`)만 다르게 설정**하면 자동으로 분리된 DB에 연결됩니다.

### A. 개발 환경 (Local / Development)
현재 사용 중인 방식입니다.
- **설정 파일**: 로컬 프로젝트의 `.env` 파일
- **DB 주소**: 현재 `.env`에 설정된 주소 (예: 서울 리전 DB)
- **동작**: `npm run dev` 실행 시 이 DB를 사용합니다.

### B. 운영 환경 (Vercel / Production)
Vercel에 배포된 실제 서비스 환경입니다. (Git `main` 브랜치)
- **데이터베이스**: 새 프로젝트 (Prod DB)
- **Vercel Env Vars**:
    - **Target**: `Production` 체크
    - `DATABASE_URL`: **운영용 DB 주소**

### C. 프리뷰 환경 (Vercel Preview)
Git 브랜치를 푸시하거나 Pull Request를 만들면 생성되는 미리보기 사이트입니다.
- **데이터베이스**: 개발용 DB (또는 별도 테스트 DB)
- **Vercel Env Vars**:
    - **Target**: `Preview` 체크 (Production 체크 해제)
    - `DATABASE_URL`: **개발용(기존 서울 리전) DB 주소**
    - 이렇게 하면 프리뷰 사이트는 안전하게 개발 DB를 사용하여 테스트할 수 있습니다.

## 3. 요약
| 환경 | DB | 설정 위치 |
| :--- | :--- | :--- |
| **Local (내 컴퓨터)** | 개발용 DB | 로컬 `.env` 파일 |
| **Preview (미리보기)** | 개발용 DB (권장) | Vercel Env Vars (`Preview` 선택) |
| **Production (실서버)** | **운영용 DB** | Vercel Env Vars (`Production` 선택) |

이제 로컬에서는 개발용 DB를 안심하고 테스트용으로 쓰고, Vercel에 배포된 사이트는 깨끗한 운영용 DB를 바라보게 됩니다.
