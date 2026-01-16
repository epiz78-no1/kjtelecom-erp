# KJ Telecom ERP 시스템

> 통신 자재 관리를 위한 통합 ERP 솔루션

[![Version](https://img.shields.io/badge/version-1.2.26-blue.svg)](https://github.com/epiz78-no1/kjtelecom-erp)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 📋 목차

- [소개](#소개)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [시작하기](#시작하기)
- [프로젝트 구조](#프로젝트-구조)
- [문서](#문서)
- [라이선스](#라이선스)

## 🎯 소개

KJ Telecom ERP는 통신 공사 자재 관리를 위한 웹 기반 ERP 시스템입니다. 일반 자재와 광케이블 관리, 현장팀 자재 추적, 입출고 관리 등을 통합적으로 지원합니다.

### 주요 특징

- 🏢 **멀티 테넌트**: 여러 회사가 독립적으로 사용 가능
- 👥 **세분화된 권한 관리**: 역할 및 기능별 접근 제어
- 📊 **실시간 재고 추적**: 사무실 및 현장팀 재고 통합 관리
- 📱 **반응형 디자인**: 데스크톱, 태블릿, 모바일 지원
- 📈 **Excel 연동**: 일괄 등록 및 데이터 내보내기

## ✨ 주요 기능

### 1. 대시보드
- 재고 현황 요약
- 현장팀 활동 현황
- 항목별 통계
- 재고 부족 알림

### 2. 일반 자재 관리
- **재고 현황**: 전체 자재 재고 조회 및 관리
- **입고 내역**: 자재 입고 등록 및 이력 관리
- **출고 내역**: 현장팀 자재 출고 관리
- **Excel 일괄 등록**: 대량 데이터 업로드 지원

### 3. 광케이블 관리
- **광케이블 현황**: 드럼 단위 재고 관리
- **입고/출고**: 광케이블 입출고 이력
- **사용 내역**: 현장별 사용량 추적
- **폐기 관리**: 폐기 케이블 기록

### 4. 현장팀 관리
- **팀별 보유 현황**: 현장팀 자재 재고
- **사용 내역 등록**: 현장 자재 사용 기록
- **반납 관리**: 자재 반납 처리

### 5. 관리자 기능
- **멤버 관리**: 사용자 계정 및 권한 설정
- **조직 관리**: 부서, 팀, 직급 관리
- **시스템 설정**: 전역 설정 및 구성

## 🛠 기술 스택

### Frontend
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Icons**: Lucide React
- **Date**: date-fns

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Authentication**: express-session

### DevOps
- **Hosting**: Vercel
- **Database**: Supabase (Dev/Prod 분리)
- **CI/CD**: Vercel Auto Deploy

## 🚀 시작하기

### 필수 요구사항

- Node.js 18.x 이상
- PostgreSQL 14.x 이상
- npm 또는 yarn

### 설치

1. **저장소 클론**
   ```bash
   git clone https://github.com/epiz78-no1/kjtelecom-erp.git
   cd kjtelecom-erp
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정**
   
   `.env` 파일 생성:
   ```env
   DATABASE_URL=your-postgresql-connection-string
   SESSION_SECRET=your-secret-key
   ```

4. **데이터베이스 설정**
   ```bash
   npm run db:push
   ```

5. **개발 서버 실행**
   ```bash
   npm run dev
   ```

   브라우저에서 `http://localhost:5000` 접속

### 프로덕션 빌드

```bash
npm run build
npm start
```

## 📁 프로젝트 구조

```
kjtelecom-erp/
├── client/                 # Frontend (React)
│   ├── src/
│   │   ├── components/    # 재사용 가능한 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   │   ├── admin/    # 관리자 페이지
│   │   │   ├── auth/     # 인증 페이지
│   │   │   ├── field/    # 현장팀 페이지
│   │   │   ├── general/  # 일반 자재 페이지
│   │   │   └── optical/  # 광케이블 페이지
│   │   ├── hooks/        # Custom React Hooks
│   │   ├── lib/          # 유틸리티 함수
│   │   └── contexts/     # React Context
│   └── public/           # 정적 파일
├── server/               # Backend (Express)
│   ├── routes/          # API 라우트
│   ├── storage/         # 데이터 액세스 계층
│   └── utils/           # 유틸리티 함수
├── shared/              # Frontend/Backend 공유 코드
│   └── schema.ts       # DB 스키마 및 타입
└── docs/               # 문서
```

## 📚 문서

- [사용자 매뉴얼](USER_MANUAL.md) - 시스템 사용 방법
- [개발자 가이드](DEVELOPER_GUIDE.md) - 개발 환경 설정 및 코딩 규칙
- [API 문서](API.md) - API 엔드포인트 레퍼런스
- [배포 가이드](DEPLOYMENT.md) - 배포 절차 및 운영 가이드
- [프로젝트 규칙](PROJECT_RULES.md) - 코딩 컨벤션 및 개발 원칙
- [디자인 가이드](DESIGN_GUIDE.md) - UI/UX 디자인 표준

## 🔐 기본 계정

개발 환경에서 테스트용 계정:

- **관리자**: `admin` / `123456`
- **일반 사용자**: 관리자가 생성

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 커밋 메시지 규칙

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅
- `refactor`: 리팩터링
- `test`: 테스트 추가
- `chore`: 빌드 작업, 패키지 매니저 설정 등

## 📝 변경 이력

자세한 변경 이력은 [CHANGELOG.md](CHANGELOG.md)를 참조하세요.

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 👨‍💻 개발팀

- **KJ Telecom** - 초기 개발 및 유지보수

## 🙏 감사의 말

- [shadcn/ui](https://ui.shadcn.com/) - UI 컴포넌트
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [TanStack Query](https://tanstack.com/query) - 데이터 페칭 라이브러리

---

**문의사항이나 버그 리포트는 [Issues](https://github.com/epiz78-no1/kjtelecom-erp/issues)에 등록해주세요.**
