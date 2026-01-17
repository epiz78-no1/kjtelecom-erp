import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useDownload() {
    const { toast } = useToast();

    const _downloadBlob = (blob: Blob, fileName: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;

        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            if (document.body.contains(a)) {
                document.body.removeChild(a);
            }
        }, 1000);
    };

    const downloadAttachment = async (file: { name: string; storagePath?: string; storageUrl?: string }, bucket: string = 'attachments') => {
        let path = file.storagePath;

        if (file.storagePath) {
            path = file.storagePath;
        } else if (file.storageUrl) {
            try {
                // URL 객체를 사용하여 안전하게 파싱
                const urlObj = new URL(file.storageUrl);
                const pathName = urlObj.pathname; // /storage/v1/object/public/attachments/folder/file.png

                // bucket으로 분리
                if (pathName.includes(`/${bucket}/`)) {
                    const parts = pathName.split(`/${bucket}/`);
                    if (parts.length > 1) {
                        // URL 디코딩 필수! (예: %20 -> 공백)
                        path = decodeURIComponent(parts[1]);
                    }
                } else if (pathName.includes('/object/public/')) {
                    const match = pathName.match(/\/object\/public\/([^/]+)\/(.+)/);
                    if (match && match[1] === bucket) {
                        path = decodeURIComponent(match[2]);
                    }
                }
            } catch (e) {
                console.warn('[Download] URL parsing error:', e);
            }
        }

        console.log('[Download] Debug:', {
            name: file.name,
            storageUrl: file.storageUrl,
            extractedPath: path,
            bucket
        });

        if (path) {
            // Proxy download를 통해 올바른 파일명으로 다운로드
            toast({
                title: "다운로드 시작",
                description: `${file.name} 다운로드를 준비합니다...`,
            });

            const proxyUrl = `/api/storage/proxy-download?bucket=${bucket}&path=${encodeURIComponent(path)}&filename=${encodeURIComponent(file.name)}`;

            try {
                // Client-Side Blob Strategy (The Ultimate Fix)
                // 1. Fetch data via proxy (auth handled by cookie)
                // 2. Create Blob URL
                // 3. Force download with correct name via a.download
                // This bypasses server header issues and cross-origin restrictions completely.

                console.log('[Download] Fetching via proxy:', proxyUrl);
                const response = await fetch(proxyUrl);

                if (!response.ok) {
                    console.error('[Download] Proxy response not ok:', response.status);
                    throw new Error(`Download failed: ${response.status}`);
                }

                const blob = await response.blob();
                console.log('[Download] Blob received:', blob.size, blob.type);

                // FileSaver.js handles all special characters and Korean text correctly
                // No need to sanitize the filename
                _downloadBlob(blob, file.name);

                toast({
                    title: "다운로드 완료",
                    description: `${file.name} 다운로드가 완료되었습니다.`,
                });
            } catch (err) {
                console.error('[Download] Proxy download error:', err);

                // Fallback to direct URL if available (might have filename issues but better than nothing)
                if (file.storageUrl) {
                    console.log('[Download] Falling back to direct URL:', file.storageUrl);
                    window.open(file.storageUrl, '_blank');
                } else {
                    toast({
                        title: "다운로드 실패",
                        description: "파일을 다운로드하는 중 오류가 발생했습니다.",
                        variant: "destructive"
                    });
                }
            }
        } else if (file.storageUrl) {
            // storageUrl은 있지만 path 추출 실패 - 직접 다운로드 시도 (파일명이 이상할 수 있음)
            console.warn('Could not extract path from storageUrl, falling back to direct download:', file.storageUrl);
            toast({
                title: "다운로드 시작",
                description: `${file.name} 다운로드를 준비합니다...`,
            });
            try {
                const response = await fetch(file.storageUrl);
                const blob = await response.blob();
                _downloadBlob(blob, file.name);
                toast({
                    title: "다운로드 완료",
                    description: `${file.name} 다운로드가 완료되었습니다.`,
                });
            } catch (e) {
                console.error("Direct download failed:", e);
                window.open(file.storageUrl, '_blank');
            }
        } else if ((file as any).data) {
            // Legacy Base64
            _downloadBlob(await (await fetch((file as any).data)).blob(), file.name);
        } else {
            toast({
                title: "다운로드 실패",
                description: "파일 경로를 찾을 수 없습니다.",
                variant: "destructive"
            });
        }
    };

    const downloadFile = async (endpoint: string, fileName: string) => {
        try {
            console.log('[Download] Fetching from endpoint:', endpoint);

            // Use direct fetch instead of queryClient to avoid caching/routing issues
            const response = await fetch(endpoint, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const text = await response.text();
                console.error('[Download] HTTP error:', response.status, text);
                throw new Error(`HTTP ${response.status}: ${text}`);
            }

            const fullRecord = await response.json();

            if (fullRecord && fullRecord.attributes) {
                const attrs = typeof fullRecord.attributes === 'string'
                    ? JSON.parse(fullRecord.attributes)
                    : fullRecord.attributes;

                // Handle single attachment
                if (attrs.attachment && (!attrs.attachments || attrs.attachments.length === 0)) {
                    await downloadAttachment(attrs.attachment);
                    return;
                }

                // Handle multiple attachments
                if (attrs.attachments && Array.isArray(attrs.attachments)) {
                    const target = attrs.attachments.find((a: any) => a.name === fileName);
                    if (target) {
                        await downloadAttachment(target);
                        return;
                    }

                    // Fallback: if filename not found but there is only one attachment, try that?
                    // Or if fileName was passed as null/undefined and we just want "the attachment"
                    if (attrs.attachments.length > 0 && !fileName) {
                        await downloadAttachment(attrs.attachments[0]);
                        return;
                    }
                }

                // Fallback for when attrs.attachment exists but is legacy structure
                if (attrs.attachment) {
                    await downloadAttachment(attrs.attachment);
                    return;
                }
            }

            // If we reached here, no attachment found
            toast({
                title: "다운로드 실패",
                description: "해당 파일 정보를 찾을 수 없습니다.",
                variant: "destructive"
            });

        } catch (error) {
            console.error("Failed to download file:", error);
            toast({
                title: "다운로드 실패",
                description: `오류: ${error instanceof Error ? error.message : String(error)}`,
                variant: "destructive"
            });
        }
    };

    return { downloadFile, downloadAttachment, downloadFromUrl: downloadAttachment }; // map downloadFromUrl to new fn for compat if needed, or remove
}
