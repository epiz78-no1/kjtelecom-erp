import { sql } from "drizzle-orm";

/**
 * Attachment 데이터에서 'data' 필드를 제거하는 SQL 생성
 * 
 * 용량 최적화를 위해 첨부파일의 Base64 데이터를 제거합니다.
 * - 1000자 미만: 그대로 반환
 * - 1000자 이상: attachments 배열에서 'data' 필드 제거
 * 
 * @param attributesColumn - attributes 컬럼 (drizzle column reference)
 * @returns SQL expression for optimized attributes
 */
export function getAttachmentsSql(attributesColumn: any) {
    return sql<string>`
    (
      CASE 
        WHEN length(${attributesColumn}) < 1000 THEN ${attributesColumn}::jsonb
        WHEN ${attributesColumn}::jsonb ? 'attachments' THEN
          jsonb_set(
            ${attributesColumn}::jsonb,
            '{attachments}',
            COALESCE(
              (
                SELECT jsonb_agg(element - 'data')
                FROM jsonb_array_elements(${attributesColumn}::jsonb -> 'attachments') AS element
              ),
              '[]'::jsonb
            )
          )
        ELSE ${attributesColumn}::jsonb
      END
    ) - 'data' #- '{attachment,data}'
  `;
}
