import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { uploadFileToStorage } from '@/lib/storage';

export interface Attachment {
    name: string;
    storageUrl: string;
    storagePath: string;
    // Optional fields for optimization stats
    originalSize?: number;
    compressedSize?: number;
    isCompressed?: boolean;
}

interface UseFileUploadOptions {
    initialAttachments?: Attachment[];
    maxFiles?: number;
    maxSizeMB?: number; // per file
}

export function useFileUpload({
    initialAttachments = [],
    maxFiles = 4,
    maxSizeMB = 10
}: UseFileUploadOptions = {}) {
    const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const currentCount = attachments.length;
        if (currentCount + files.length > maxFiles) {
            toast({
                title: "파일 개수 초과",
                description: `최대 ${maxFiles}개까지 첨부할 수 있습니다. (현재 ${currentCount}개)`,
                variant: "destructive"
            });
            e.target.value = ''; // Reset input
            return;
        }

        setIsUploading(true);
        // Show loading toast
        toast({
            title: "파일 업로드 중...",
            description: `${files.length}개의 파일을 업로드하고 있습니다.`,
        });

        const newAttachments: Attachment[] = [...attachments];
        let successCount = 0;
        let totalOriginalSize = 0;
        let totalCompressedSize = 0;

        const uploadPromises = files.map(async (file) => {
            if (file.size > maxSizeMB * 1024 * 1024) {
                return {
                    status: 'rejected' as const,
                    reason: new Error(`${file.name} 파일이 ${maxSizeMB}MB를 초과합니다.`),
                    file
                };
            }

            try {
                const uploadedFile = await uploadFileToStorage(file);
                return {
                    status: 'fulfilled' as const,
                    value: uploadedFile,
                    file
                };
            } catch (error: any) {
                return {
                    status: 'rejected' as const,
                    reason: error,
                    file
                };
            }
        });

        const results = await Promise.all(uploadPromises);

        for (const result of results) {
            if (result.status === 'fulfilled') {
                const uploadedFile = result.value;
                newAttachments.push(uploadedFile);
                successCount++;

                if (uploadedFile.isCompressed) {
                    totalOriginalSize += uploadedFile.originalSize || 0;
                    totalCompressedSize += uploadedFile.compressedSize || 0;
                }
            } else {
                console.error("Upload error for file:", result.file.name, result.reason);
                toast({
                    title: "파일 업로드 실패",
                    description: `${result.file.name}: ${result.reason.message}`,
                    variant: "destructive"
                });
            }
        }

        // Summary Toast
        if (successCount > 0) {
            let description = `총 ${successCount}개의 파일이 성공적으로 등록되었습니다.`;

            if (totalOriginalSize > 0 && totalCompressedSize > 0) {
                const savedSize = totalOriginalSize - totalCompressedSize;
                const savedMB = (savedSize / (1024 * 1024)).toFixed(2);
                description += `\n(이미지 최적화: ${savedMB}MB 절약됨)`;
            }

            toast({
                title: "업로드 완료",
                description: description,
            });
        }

        setAttachments(newAttachments);
        setIsUploading(false);
        e.target.value = ''; // Reset for next selection
    };

    const removeAttachment = (index: number) => {
        const newAttachments = attachments.filter((_, i) => i !== index);
        setAttachments(newAttachments);
    };

    const clearAttachments = () => {
        setAttachments([]);
    };

    return {
        attachments,
        setAttachments,
        handleFileChange,
        removeAttachment,
        clearAttachments,
        isUploading
    };
}
