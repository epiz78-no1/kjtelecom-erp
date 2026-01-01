/**
 * 이미지 압축 유틸리티
 * 이미지를 지정된 최대 크기와 품질로 압축합니다.
 */

interface CompressOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeMB?: number;
}

const DEFAULT_OPTIONS: CompressOptions = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.8,
    maxSizeMB: 5
};

/**
 * 이미지 파일을 압축합니다
 * @param file 원본 이미지 파일
 * @param options 압축 옵션
 * @returns 압축된 이미지의 Base64 데이터 URL
 */
export async function compressImage(
    file: File,
    options: CompressOptions = {}
): Promise<{ data: string; name: string; size: number; type: string }> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // PDF는 압축하지 않음
    if (file.type === 'application/pdf') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    data: e.target?.result as string,
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // 이미지가 아니면 그대로 반환
    if (!file.type.startsWith('image/')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    data: e.target?.result as string,
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                // 캔버스 생성
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // 최대 크기 제한
                if (width > opts.maxWidth! || height > opts.maxHeight!) {
                    const ratio = Math.min(opts.maxWidth! / width, opts.maxHeight! / height);
                    width = width * ratio;
                    height = height * ratio;
                }

                canvas.width = width;
                canvas.height = height;

                // 이미지 그리기
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context를 가져올 수 없습니다'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // 압축된 이미지를 Base64로 변환
                const compressedDataUrl = canvas.toDataURL(file.type, opts.quality);

                // Base64 크기 계산 (바이트)
                const base64Length = compressedDataUrl.length - (compressedDataUrl.indexOf(',') + 1);
                const sizeInBytes = (base64Length * 3) / 4;

                // 최대 크기 체크
                const maxSizeBytes = (opts.maxSizeMB || 5) * 1024 * 1024;
                if (sizeInBytes > maxSizeBytes) {
                    reject(new Error(`파일 크기가 ${opts.maxSizeMB}MB를 초과합니다`));
                    return;
                }

                resolve({
                    data: compressedDataUrl,
                    name: file.name,
                    size: Math.round(sizeInBytes),
                    type: file.type
                });
            };

            img.onerror = () => {
                reject(new Error('이미지를 로드할 수 없습니다'));
            };

            img.src = e.target?.result as string;
        };

        reader.onerror = () => {
            reject(new Error('파일을 읽을 수 없습니다'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
