import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('SUPABASE_URL and SUPABASE_SERVICE_KEY are not set. File uploads will not work.');
}

const supabase = (supabaseUrl && supabaseServiceKey)
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

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
    if (!supabase) throw new Error("Supabase client not configured");
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
    if (!supabase) return "";
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

/**
 * Storage 파일 삭제
 * @param bucket 버킷 이름
 * @param path 파일 경로
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
    if (!supabase) throw new Error("Supabase client not configured");
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

/**
 * 업로드용 Signed URL 생성 (Client 직접 업로드용)
 * @param bucket 버킷 이름
 * @param path 파일 경로
 * @returns Signed URL 데이터
 */
export async function createSignedUploadUrl(bucket: string, path: string): Promise<{ signedUrl: string; token: string; path: string }> {
    if (!supabase) throw new Error("Supabase client not configured");

    // 60초(1분) 동안 유효한 Signed URL 생성
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(path);

    if (error) {
        console.error('Create Signed URL error:', error);
        throw new Error(`Signed URL 생성 실패: ${error.message}`);
    }

    return data;
}

/**
 * 다운로드용 Signed URL 생성 (강제 다운로드 처리)
 * @param bucket 버킷 이름
 * @param path 파일 경로
 * @param filename 다운로드될 파일명
 */
export async function createSignedDownloadUrl(bucket: string, path: string, filename?: string): Promise<{ signedUrl: string }> {
    if (!supabase) throw new Error("Supabase client not configured");

    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60, { // 60초 유효
            download: filename || true // true면 원본 파일명, 문자열이면 그 이름으로 다운로드
        });

    if (error) {
        console.error('Create Signed Download URL error:', error);
        throw new Error(`다운로드 URL 생성 실패: ${error.message}`);
    }

    return data;
}

/**
 * 파일을 스트림으로 다운로드 (Proxy용)
 * @param bucket 버킷 이름
 * @param path 파일 경로
 */
export async function downloadFileStream(bucket: string, path: string): Promise<Blob> {
    if (!supabase) throw new Error("Supabase client not configured");

    const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

    if (error) {
        console.error('Download stream error:', error);
        throw new Error(`파일 다운로드 실패: ${error.message}`);
    }

    return data;
}

/**
 * 테넌트의 실제 스토리지 사용량을 Supabase Storage에서 계산
 * @param tenantId 테넌트 ID
 * @param bucket 버킷 이름 (기본값: 'attachments')
 * @returns 총 사용량(bytes)과 파일 개수
 */
export async function calculateTenantStorageUsage(
    tenantId: string,
    bucket: string = 'attachments'
): Promise<{ totalBytes: number; fileCount: number }> {
    if (!supabase) {
        throw new Error("Supabase client not configured");
    }

    try {
        // 테넌트별 폴더에서 파일 조회
        const { data: files, error } = await supabase.storage
            .from(bucket)
            .list(tenantId, {
                limit: 10000,
                sortBy: { column: 'name', order: 'asc' }
            });

        if (error) {
            console.error('Storage list error:', error);
            // If listing fails, return 0 instead of throwing
            console.warn(`Failed to list files for tenant ${tenantId}, returning 0 usage`);
            return { totalBytes: 0, fileCount: 0 };
        }

        if (!files || files.length === 0) {
            return { totalBytes: 0, fileCount: 0 };
        }

        // Sum up all file sizes in tenant folder
        const totalBytes = files.reduce((sum, file) => {
            return sum + (file.metadata?.size || 0);
        }, 0);

        return {
            totalBytes,
            fileCount: files.length
        };
    } catch (error: any) {
        console.error('Error calculating storage usage:', error);
        // Return 0 instead of throwing to prevent breaking the tenant list endpoint
        return { totalBytes: 0, fileCount: 0 };
    }
}
