import { queryClient } from "@/lib/queryClient";

export function useDownload() {
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

                if (attrs.attachment && attrs.attachment.data) {
                    const link = document.createElement('a');
                    link.href = attrs.attachment.data;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else if (attrs.attachments && Array.isArray(attrs.attachments)) {
                    const target = attrs.attachments.find((a: any) => a.name === fileName);
                    if (target && target.data) {
                        const link = document.createElement('a');
                        link.href = target.data;
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
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
