# 배포 가이드

이 문서는 운영 서버로의 안전한 배포 절차를 설명합니다.

## 배포 전 필수 체크리스트

### 1. 데이터베이스 스키마 검증

운영 DB와 개발 DB의 스키마가 일치하는지 확인해야 합니다.

```bash
# 운영 DB URL 환경변수 설정 (한 번만 실행)
export DATABASE_URL_PROD='your-production-database-url'

# 스키마 검증 실행
./scripts/pre-deploy-check.sh
```

**결과**:
- ✅ **통과**: 스키마가 일치하면 배포 진행 가능
- ❌ **실패**: 스키마 불일치 발견 시 배포 중단
  - 운영 DB에 마이그레이션 적용 필요
  - 수정 후 다시 검증

### 2. 로컬 빌드 테스트

```bash
npm run build
```

빌드 오류가 없는지 확인합니다.

### 3. 코드 리뷰

중요한 변경사항은 팀원의 코드 리뷰를 받습니다.

## 배포 절차

### 개발 서버 배포 (dev 브랜치)

```bash
# 변경사항 커밋
git add .
git commit -m "feat: your feature description"

# dev 브랜치에 푸시
git push origin dev
```

Vercel이 자동으로 개발 환경에 배포합니다.

### 운영 서버 배포 (main 브랜치)

> ⚠️ **주의**: 운영 배포 전 반드시 DB 스키마를 운영 데이터베이스에 푸시하세요!

```bash
# 1. 운영 DB에 스키마 푸시 (PowerShell)
$env:DATABASE_URL="postgresql://postgres.ggyibpyypykpcqxmgbgt:chldhrwn7908%3F@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"; npm run db:push

# 또는 Bash
DATABASE_URL="postgresql://postgres.ggyibpyypykpcqxmgbgt:chldhrwn7908%3F@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres" npm run db:push

# 2. "Changes applied" 또는 "No changes detected" 확인

# 3. main 브랜치로 전환
git checkout main

# 4. dev 브랜치 병합
git merge dev

# 5. 운영 서버로 푸시
git push origin main

# 6. dev 브랜치로 복귀
git checkout dev
```

**중요**: 
- 스키마 변경이 있는 경우 반드시 1번 단계를 먼저 실행
- "Changes applied" 메시지 확인 후 배포 진행
- 스키마 푸시 없이 배포하면 운영 서버 오류 발생 가능

## 환경변수 설정

### 로컬/개발 환경

`.env` 파일에 개발용 DB URL 설정:

```
DATABASE_URL=your-dev-database-url
```

### 운영 환경 (Vercel)

Vercel 대시보드에서 환경변수 설정:
- `DATABASE_URL`: 운영용 DB URL
- 기타 필요한 환경변수

### DB 스키마 검증용

로컬 터미널에서 운영 DB URL 설정:

```bash
export DATABASE_URL_PROD='your-production-database-url'
```

## 롤백 절차

배포 후 문제 발생 시:

1. Vercel 대시보드에서 이전 배포 버전으로 롤백
2. 또는 Git에서 이전 커밋으로 되돌리기:

```bash
git checkout main
git revert HEAD
git push origin main
```

## 문제 해결

### DB 스키마 불일치

운영 DB에 마이그레이션 적용:

```bash
# Drizzle Kit으로 마이그레이션 생성
npx drizzle-kit generate:pg

# 운영 DB에 마이그레이션 적용
# (수동으로 SQL 실행 또는 마이그레이션 스크립트 사용)
```

### 배포 후 버전 확인

운영 사이트 접속 후 사이드바 하단의 버전 번호 확인:
- 최신 버전이 표시되면 배포 성공
- 구버전이 표시되면 브라우저 캐시 삭제 후 재확인
