import { supabase } from './supabase';

/**
 * 파일을 Supabase Storage에 직접 업로드
 * @param file 업로드할 파일
 * @param bucket 버킷 이름 (기본값: 'attachments')
 * @returns storageUrl과 storagePath
 */
export async function uploadFileToStorage(
    file: File,
    bucket: string = 'attachments'
): Promise<{ name: string; storageUrl: string; storagePath: string }> {
    if (!supabase) {
        throw new Error('Supabase client가 초기화되지 않았습니다.');
    }

    // 파일명 안전하게 변환 (특수문자 제거)
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${timestamp}_${safeName}`;

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`파일 업로드 실패: ${error.message}`);
    }

    // 공개 URL 생성
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

    return {
        name: file.name,
        storageUrl: publicUrl,
        storagePath: data.path
    };
}

/**
 * Supabase Storage에서 파일 삭제
 * @param storagePath 삭제할 파일 경로
 * @param bucket 버킷 이름 (기본값: 'attachments')
 */
export async function deleteFileFromStorage(
    storagePath: string,
    bucket: string = 'attachments'
): Promise<void> {
    if (!supabase) {
        throw new Error('Supabase client가 초기화되지 않았습니다.');
    }

    const { error } = await supabase.storage
        .from(bucket)
        .remove([storagePath]);

    if (error) {
        console.error('Storage delete error:', error);
        throw new Error(`파일 삭제 실패: ${error.message}`);
    }
}

/**
 * 여러 파일을 한번에 업로드
 * @param files 업로드할 파일 배열
 * @param bucket 버킷 이름 (기본값: 'attachments')
 * @returns 업로드된 파일 정보 배열
 */
export async function uploadMultipleFiles(
    files: File[],
    bucket: string = 'attachments'
): Promise<Array<{ name: string; storageUrl: string; storagePath: string }>> {
    const uploadPromises = files.map(file => uploadFileToStorage(file, bucket));
    return Promise.all(uploadPromises);
}
