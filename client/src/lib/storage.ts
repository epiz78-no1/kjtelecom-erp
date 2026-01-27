import { supabase } from './supabase';
import imageCompression from 'browser-image-compression';

/**
 * 파일을 Supabase Storage에 직접 업로드
 * @param file 업로드할 파일
 * @param bucket 버킷 이름 (기본값: 'attachments')
 * @returns storageUrl과 storagePath
 */
export async function uploadFileToStorage(
    file: File,
    bucket: string = 'attachments'
): Promise<{ name: string; storageUrl: string; storagePath: string; originalSize?: number; compressedSize?: number; isCompressed?: boolean }> {
    // 0. 이미지 압축 (이미지인 경우만)
    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
        try {
            const options = {
                maxSizeMB: 1, // 1MB 제한
                maxWidthOrHeight: 1920, // FHD 제한
                useWebWorker: true
            };
            fileToUpload = await imageCompression(file, options);
            // 압축 후 이름 등 메타데이터 유지 (필요에 따라)
        } catch (error) {
            console.warn('Image compression failed, using original file:', error);
        }
    }

    // 1. 파일명 안전하게 변환 (한글/공백 문제 해결을 위해 영문+숫자 조합 사용)
    // 원본 파일명은 name 필드에 따로 저장되므로 path는 안전하게 생성함
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || '';
    const randomId = Math.random().toString(36).substring(2, 11); // 9자리 랜덤 문자열
    const path = `${timestamp}_${randomId}.${ext}`;

    // 2. 서버에 Signed URL 요청 (Client 인증 무시)
    // 2. 서버에 Signed URL 요청 (Client 인증 무시)
    let signResponse;
    try {
        signResponse = await fetch('/api/storage/sign-upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bucket, path, fileSize: fileToUpload.size }),
        });
    } catch (e: any) {
        throw new Error(`서버 연결 실패 (URL 발급): ${e.message}`);
    }

    if (!signResponse.ok) {
        const errData = await signResponse.json().catch(() => ({}));
        throw new Error(errData.error || `업로드 URL 발급 실패: ${signResponse.status} ${signResponse.statusText}`);
    }

    const { signedUrl, token } = await signResponse.json();

    // 3. Signed URL로 업로드 (Supabase SDK 사용 권장)
    if (supabase) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .uploadToSignedUrl(path, token, fileToUpload);

        if (error) {
            console.error('SDK Upload error:', error);
            console.error('Error details:', {
                message: error.message,
                bucket,
                path,
                fileSize: fileToUpload.size,
                fileType: fileToUpload.type,
                fullError: JSON.stringify(error)
            });
            throw new Error(`파일 업로드 실패 (SDK): ${error.message}`);
        }
    } else {
        // Fallback: Supabase Client가 없는 경우 직접 fetch (거의 발생 안함)
        let uploadResponse;
        try {
            uploadResponse = await fetch(signedUrl, {
                method: 'PUT',
                body: fileToUpload,
                headers: {
                    'Content-Type': fileToUpload.type,
                },
            });
        } catch (e: any) {
            throw new Error(`파일 업로드 연결 실패: ${e.message}`);
        }

        if (!uploadResponse.ok) {
            throw new Error(`파일 업로드 실패 (${uploadResponse.status}): ${uploadResponse.statusText}`);
        }
    }

    // 4. 공개 URL 생성 (Supabase Client 사용 - 이건 anon key로도 가능)
    // 만약 이것도 안되면 서버에서 URL 받아서 내려줘야 함. 
    // 하지만 getPublicUrl은 DB 접근 안하고 순수 URL 생성이므로 로컬 Client로 가능.
    // 혹시 모르니 안전하게 Client가 있으면 쓰고, 없으면 직접 조합
    let publicUrl = '';

    if (supabase) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        publicUrl = data.publicUrl;
    } else {
        // Fallback: 직접 URL 조합 (VITE_SUPABASE_URL 환경변수 필요)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl) {
            publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
        } else {
            // 최악의 경우: 비워두거나 에러 (하지만 VITE_SUPABASE_URL은 보통 있음)
            console.warn('VITE_SUPABASE_URL missing, cannot generate publicUrl');
        }
    }

    return {
        name: file.name,
        storageUrl: publicUrl,
        storagePath: path,
        originalSize: file.size,
        compressedSize: fileToUpload.size,
        isCompressed: file.size > fileToUpload.size
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
): Promise<Array<{ name: string; storageUrl: string; storagePath: string; originalSize?: number; compressedSize?: number; isCompressed?: boolean }>> {
    const uploadPromises = files.map(file => uploadFileToStorage(file, bucket));
    return Promise.all(uploadPromises);
}
