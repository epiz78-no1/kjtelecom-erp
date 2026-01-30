/**
 * 현재 경로를 기반으로 페이지 대분류 타이틀을 반환합니다.
 * Header 컴포넌트의 탭 구조와 일치하도록 설계되었습니다.
 * 
 * 새로운 대분류가 추가될 때는 이 함수만 수정하면 됩니다.
 */
export function getPageTitle(location: string): string {
    // 인증 페이지
    if (location === '/login') return '로그인';
    if (location === '/register') return '회원가입';
    if (location === '/tenant-select') return '조직 선택';

    // 홈
    if (location === '/') return '홈';

    // 자료실
    if (location.startsWith('/archives')) return '자료실';

    // 관리 (Admin)
    if (location.startsWith('/admin')) return '관리';

    // 설정
    if (location.startsWith('/settings')) return '설정';

    // 기본값: 자재관리 (모든 자재 관련 페이지)
    return '자재관리';
}
