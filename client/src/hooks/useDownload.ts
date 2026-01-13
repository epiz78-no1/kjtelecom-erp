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
            const fullRecord = await queryClient.fetchQuery<any>({
                queryKey: [endpoint],
                staleTime: 0
            });

            if (fullRecord && fullRecord.attributes) {
                const attrs = typeof fullRecord.attributes === 'string'
                    ? JSON.parse(fullRecord.attributes)
                    : fullRecord.attributes;

                // Handle single attachment
                if (attrs.attachment) {
                    // New format: Storage URL
                    if (attrs.attachment.storageUrl) {
                        await downloadFromUrl(attrs.attachment.storageUrl, fileName);
                        return;
                    }
                    // Legacy format: Base64
                    if (attrs.attachment.data) {
                        const link = document.createElement('a');
                        link.href = attrs.attachment.data;
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        return;
                    }
                }

                // Handle multiple attachments
                if (attrs.attachments && Array.isArray(attrs.attachments)) {
                    const target = attrs.attachments.find((a: any) => a.name === fileName);
                    if (target) {
                        // New format: Storage URL
                        if (target.storageUrl) {
                            await downloadFromUrl(target.storageUrl, fileName);
                            return;
                        }
                        // Legacy format: Base64
                        if (target.data) {
                            const link = document.createElement('a');
                            link.href = target.data;
                            link.download = fileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            return;
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Failed to download file", error);
            alert("파일 다운로드에 실패했습니다.");
        }
    };

    return { downloadFile };
}
