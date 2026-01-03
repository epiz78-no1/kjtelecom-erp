// Feature Flags controls
// true: 기능 활성화 (개발/운영)
// false: 기능 비활성화 (운영 배포 시 숨김 처리)

export const FEATURE_FLAGS = {
    // 1. 로컬 개발 환경(DEV -> npm run dev)이면 true
    // 2. 환경변수 VITE_ENABLE_OPTICAL이 'true'이면 true (Vercel Dev/Preview 환경용)
    // 3. 그 외(Vercel Production)는 false
    ENABLE_OPTICAL: import.meta.env.DEV || import.meta.env.VITE_ENABLE_OPTICAL === 'true',
};
