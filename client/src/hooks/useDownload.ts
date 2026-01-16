import { queryClient } from "@/lib/queryClient";

export function useDownload() {

    const downloadFromUrl = async (url: string, fileName: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const objectUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(objectUrl);
        } catch (e) {
            console.error("Blob download failed, falling back to window.open:", e);
            window.open(url, '_blank');
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
            console.log('[Download] Record fetched, has attributes:', !!fullRecord.attributes);

            if (fullRecord && fullRecord.attributes) {
                const attrs = typeof fullRecord.attributes === 'string'
                    ? JSON.parse(fullRecord.attributes)
                    : fullRecord.attributes;

                // Handle single attachment
                if (attrs.attachment) {
                    console.log('[Download] Single attachment found');
                    // New format: Storage URL
                    if (attrs.attachment.storageUrl) {
                        console.log('[Download] Using storageUrl:', attrs.attachment.storageUrl);
                        await downloadFromUrl(attrs.attachment.storageUrl, fileName);
                        return;
                    }
                    // Legacy format: Base64
                    if (attrs.attachment.data) {
                        console.log('[Download] Using base64 data');
                        const link = document.createElement('a');
                        link.href = attrs.attachment.data;
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        return;
                    }
                    console.error('[Download] No storageUrl or data found in attachment');
                }

                // Handle multiple attachments
                if (attrs.attachments && Array.isArray(attrs.attachments)) {
                    console.log('[Download] Multiple attachments found:', attrs.attachments.length);
                    const target = attrs.attachments.find((a: any) => a.name === fileName);
                    if (target) {
                        console.log('[Download] Target file found:', target.name);
                        // New format: Storage URL
                        if (target.storageUrl) {
                            console.log('[Download] Using storageUrl:', target.storageUrl);
                            await downloadFromUrl(target.storageUrl, fileName);
                            return;
                        }
                        // Legacy format: Base64
                        if (target.data) {
                            console.log('[Download] Using base64 data');
                            const link = document.createElement('a');
                            link.href = target.data;
                            link.download = fileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            return;
                        }
                        console.error('[Download] No storageUrl or data found in target');
                    } else {
                        console.error('[Download] Target file not found in attachments');
                    }
                } else {
                    console.log('[Download] No attachments array found');
                }
            }
        } catch (error) {
            console.error("Failed to download file:", error);
            console.error("Endpoint:", endpoint);
            console.error("Filename:", fileName);
            alert(`파일 다운로드에 실패했습니다.\n\n오류 내용: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    return { downloadFile };
}
