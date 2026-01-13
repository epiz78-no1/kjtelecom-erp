import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 파일을 Supabase Storage에 업로드
 * @param bucket 버킷 이름 (예: 'attachments')
 * @param path 파일 경로 (예: 'incoming/123_file.jpg')
 * @param fileBuffer 파일 Buffer
 * @param contentType MIME 타입 (예: 'image/jpeg')
 * @returns 업로드된 파일 경로
 */
export async function uploadFile(
    bucket: string,
    path: string,
    fileBuffer: Buffer,
    contentType: string
): Promise<string> {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, fileBuffer, {
            contentType,
            upsert: false, // 덮어쓰기 방지
        });

    if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`파일 업로드 실패: ${error.message}`);
    }

    return data.path;
}

/**
 * Storage 파일의 공개 URL 생성
 * @param bucket 버킷 이름
 * @param path 파일 경로
 * @returns 공개 URL
 */
export function getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

/**
 * Storage 파일 삭제
 * @param bucket 버킷 이름
 * @param path 파일 경로
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
        console.error('Storage delete error:', error);
        throw new Error(`파일 삭제 실패: ${error.message}`);
    }
}

/**
 * Base64 데이터를 Buffer로 변환
 * @param base64Data Base64 문자열 (data:image/jpeg;base64,... 형식 또는 순수 Base64)
 * @returns Buffer
 */
export function base64ToBuffer(base64Data: string): Buffer {
    // data:image/jpeg;base64, 부분 제거
    const base64String = base64Data.includes(',')
        ? base64Data.split(',')[1]
        : base64Data;

    return Buffer.from(base64String, 'base64');
}

/**
 * 파일 확장자 추출
 * @param filename 파일명
 * @returns 확장자 (예: 'jpg', 'png')
 */
export function getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';
}

/**
 * MIME 타입 추론
 * @param filename 파일명
 * @returns MIME 타입
 */
export function getMimeType(filename: string): string {
    const ext = getFileExtension(filename);
    const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'pdf': 'application/pdf',
    };
    return mimeTypes[ext] || 'application/octet-stream';
}
