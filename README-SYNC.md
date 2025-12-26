# 🔄 GitHub 자동 동기화 가이드

이 프로젝트는 GitHub와 자동으로 동기화할 수 있는 스크립트를 제공합니다.

## 📦 제공되는 스크립트

### 1. `auto-sync.sh` - 수동 동기화
변경사항을 즉시 GitHub에 푸시합니다.

**사용법:**
```bash
# 실행 권한 부여 (최초 1회)
chmod +x auto-sync.sh

# 자동 커밋 메시지로 동기화
./auto-sync.sh

# 커스텀 커밋 메시지로 동기화
./auto-sync.sh "기능 추가: 재고 관리 개선"
```

### 2. `watch-sync.sh` - 자동 감시 및 동기화
파일 변경을 주기적으로 감시하고 자동으로 동기화합니다.

**사용법:**
```bash
# 실행 권한 부여 (최초 1회)
chmod +x watch-sync.sh

# 30초마다 변경사항 확인 (기본값)
./watch-sync.sh

# 60초마다 변경사항 확인
./watch-sync.sh 60

# 종료: Ctrl+C
```

## 🚀 빠른 시작

### 1단계: 스크립트 실행 권한 부여
```bash
chmod +x auto-sync.sh watch-sync.sh
```

### 2단계: 현재 변경사항 동기화
```bash
./auto-sync.sh "초기 설정 완료"
```

### 3단계 (선택사항): 자동 감시 시작
```bash
# 백그라운드에서 실행하려면:
nohup ./watch-sync.sh 30 > sync.log 2>&1 &

# 로그 확인:
tail -f sync.log
```

## 📋 스크립트 기능

### `auto-sync.sh`
- ✅ 모든 변경사항 자동 스테이징
- ✅ 타임스탬프가 포함된 자동 커밋 메시지
- ✅ 원격 저장소와 자동 병합 (rebase)
- ✅ GitHub에 자동 푸시
- ✅ 컬러풀한 진행 상황 표시

### `watch-sync.sh`
- ✅ 주기적인 파일 변경 감시
- ✅ 변경 감지 시 자동 동기화
- ✅ 실시간 상태 표시
- ✅ 사용자 정의 감시 간격

## ⚙️ 고급 사용법

### 백그라운드에서 자동 동기화 실행
```bash
# 시작
nohup ./watch-sync.sh 30 > sync.log 2>&1 &
echo $! > sync.pid

# 중지
kill $(cat sync.pid)
rm sync.pid
```

### 특정 파일만 동기화
```bash
# auto-sync.sh를 수정하여 사용하거나, 직접 git 명령 사용
git add 특정파일.ts
git commit -m "특정 파일 업데이트"
git push
```

## 🔗 저장소 정보

- **GitHub 저장소**: [https://github.com/epiz78-no1/kjtelecom-erp](https://github.com/epiz78-no1/kjtelecom-erp)
- **현재 브랜치**: main

## ⚠️ 주의사항

1. **충돌 발생 시**: 스크립트가 자동으로 처리하지 못하는 병합 충돌이 발생하면 수동으로 해결해야 합니다.
2. **네트워크 연결**: GitHub에 푸시하려면 인터넷 연결이 필요합니다.
3. **인증**: GitHub 인증이 설정되어 있어야 합니다 (SSH 키 또는 Personal Access Token).
4. **백업**: 중요한 변경사항은 로컬 백업도 권장합니다.

## 🛠️ 문제 해결

### Push 권한 오류
```bash
# SSH 키 확인
ssh -T git@github.com

# HTTPS를 사용하는 경우 Personal Access Token 설정
git config credential.helper store
```

### 병합 충돌
```bash
# 충돌 파일 확인
git status

# 충돌 해결 후
git add .
git rebase --continue
git push
```

## 📝 팁

- 작업 시작 전에 `./auto-sync.sh "작업 시작"`으로 현재 상태 저장
- 중요한 기능 완성 후 의미있는 커밋 메시지 사용
- `watch-sync.sh`는 개발 중에만 사용하고, 완성된 기능은 수동으로 커밋하는 것을 권장
