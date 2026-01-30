# 운영 서버 스크립트 실행 가이드

## 1. 환경 설정

`.env.production` 파일에 운영 서버 정보를 입력하세요:

```env
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-x-xx-xxxx-x.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=5001
```

## 2. 스크립트 실행 방법

### Windows PowerShell

```powershell
# 방법 1: 환경 변수 직접 설정
$env:DATABASE_URL="운영서버_DATABASE_URL"; npx tsx scripts/update_recipient_to_name.ts

# 방법 2: .env.production 파일 사용 (dotenv-cli 필요)
npx dotenv -e .env.production -- tsx scripts/update_recipient_to_name.ts
```

### 사용 가능한 스크립트

1. **check_recipient_values.ts** - recipient 값 확인
   ```powershell
   $env:DATABASE_URL="운영서버_URL"; npx tsx scripts/check_recipient_values.ts
   ```

2. **update_recipient_to_name.ts** - recipient를 실명으로 변경
   ```powershell
   $env:DATABASE_URL="운영서버_URL"; npx tsx scripts/update_recipient_to_name.ts
   ```

## 3. 주의사항

⚠️ **운영 서버 작업 시 주의사항:**
- 반드시 백업 후 실행
- 먼저 `check_recipient_values.ts`로 현재 상태 확인
- 테스트 환경에서 먼저 검증 권장
- 실행 전 팀원들에게 공지

## 4. 실행 순서

```powershell
# 1단계: 현재 상태 확인
$env:DATABASE_URL="운영서버_URL"; npx tsx scripts/check_recipient_values.ts

# 2단계: 문제가 있다면 업데이트 실행
$env:DATABASE_URL="운영서버_URL"; npx tsx scripts/update_recipient_to_name.ts

# 3단계: 결과 재확인
$env:DATABASE_URL="운영서버_URL"; npx tsx scripts/check_recipient_values.ts
```
