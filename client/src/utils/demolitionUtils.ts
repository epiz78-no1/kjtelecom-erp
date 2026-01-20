import { DemolitionMaterial } from "@/types/demolition";

/**
 * JSON 문자열 또는 객체 형태의 attributes를 안전하게 파싱하여 첨부파일 목록 등을 반환합니다.
 * @param attributes JSON string or object
 * @returns Parsed attributes object with verified attachments array
 */
export const parseAttributes = (attributes: any) => {
    try {
        if (!attributes) return {};
        const attrs = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;

        // Normalize attachments to array
        let attachments: any[] = [];
        if (attrs.attachments && Array.isArray(attrs.attachments)) {
            attachments = attrs.attachments;
        } else if (attrs.attachment) {
            attachments = [attrs.attachment];
        }

        return {
            ...attrs,
            attachments
        };
    } catch (e) {
        console.error('Failed to parse attributes:', e);
        return {};
    }
};

/**
 * 상태 코드에 따른 표시 라벨과 스타일(Badge variant)을 반환합니다.
 */
export const getStatusInfo = (status: string, remainingQuantity: number = 0) => {
    // 상태 우선순위: 소진/폐기 -> 반려 -> 미사용 -> 사용중 -> 대기
    if (status === 'disposed' || remainingQuantity === 0) {
        return { label: '소진/폐기', variant: 'destructive', rowClass: 'bg-red-100/50 hover:bg-red-200/50' };
    }
    if (status === 'rejected') {
        return { label: '반려', variant: 'destructive', rowClass: 'bg-red-100/50 hover:bg-red-200/50' };
    }
    if (status === 'in_use') {
        return { label: '사용중/현장', variant: 'default', rowClass: 'bg-blue-100/50 hover:bg-blue-200/50' };
    }
    if (status === 'approved_reusable') {
        return { label: '승인(미사용)', variant: 'secondary', rowClass: 'hover:bg-muted/50' };
    }
    if (status === 'pending_review') {
        return { label: '검토중', variant: 'outline', rowClass: 'bg-yellow-50/50 hover:bg-yellow-100/50' };
    }
    return { label: status, variant: 'secondary', rowClass: 'hover:bg-muted/50' };
};
