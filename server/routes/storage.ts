
import { Router } from "express";
import { createSignedUploadUrl, createSignedDownloadUrl, downloadFileStream } from "../lib/storage.js";
import contentDisposition from "content-disposition";
import { db } from "../db.js";
import { eq } from "drizzle-orm";
import { tenants } from "../../shared/schema.js";

export function registerStorageRoutes(app: any) {
    const router = Router();

    // Signed URL 발급 API
    router.post("/sign-upload", async (req, res) => {
        // 1. 권한 확인 (로그인한 사용자만 허용)
        if (!req.session?.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        try {
            const { bucket, path, fileSize } = req.body;

            if (!bucket || !path) {
                return res.status(400).json({ error: "Missing bucket or path" });
            }

            // 1.5 스토리지 용량 제한 확인
            if (req.session.tenantId && fileSize) {
                const tenantId = req.session.tenantId;
                const tenant = await db.query.tenants.findFirst({
                    where: eq(tenants.id, tenantId)
                });

                if (tenant) {
                    const limit = BigInt(tenant.storageLimit);
                    const used = BigInt(tenant.usedStorage);
                    const size = BigInt(fileSize);

                    if (used + size > limit) {
                        return res.status(403).json({ error: "저장 용량을 초과하여 업로드할 수 없습니다." });
                    }
                }
            }

            // 2. 테넌트별 폴더 구조로 경로 수정
            const tenantId = req.session.tenantId;
            const finalPath = tenantId ? `${tenantId}/${path}` : path;

            // 3. Signed URL 생성
            const data = await createSignedUploadUrl(bucket, finalPath);

            // 4. Client에 전달
            res.json(data);
        } catch (error: any) {
            console.error("Signed URL error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // Signed URL 발급 API (다운로드용)
    router.post("/sign-download", async (req, res) => {
        if (!req.session?.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        try {
            const { bucket, path, filename } = req.body;
            if (!bucket || !path) {
                return res.status(400).json({ error: "Missing bucket or path" });
            }
            // 2. Signed URL 생성 (download 옵션 포함)
            const { signedUrl } = await createSignedDownloadUrl(bucket, path, filename);
            res.json({ signedUrl });
        } catch (error: any) {
            console.error("Signed Download URL error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // Proxy Download API (서버가 대신 받아서 전달 - 가장 강력한 다운로드 강제)
    router.get("/proxy-download", async (req, res) => {
        const { bucket, path, filename } = req.query;
        console.log('[Proxy] Request:', { bucket, path, filename });

        if (!req.session?.userId) {
            return res.status(401).send("Unauthorized");
        }
        try {
            if (!bucket || !path || typeof bucket !== 'string' || typeof path !== 'string') {
                return res.status(400).send("Missing bucket or path");
            }

            // 1. Supabase에서 파일 데이터(Blob) 가져오기
            const blob = await downloadFileStream(bucket, path);
            const buffer = Buffer.from(await blob.arrayBuffer());

            // 2. 헤더 설정 (무조건 다운로드)
            const downloadFilename = typeof filename === 'string' ? filename : path.split('/').pop() || 'download';

            // RFC 2231/5987 형식으로 직접 헤더 생성
            // 한글 파일명을 위해 filename*=UTF-8''encoded_name 형식 사용
            // encodeURIComponent는 '()!~*' 등을 인코딩하지 않으므로 추가 처리가 필요함
            // RFC 5987 attr-char 허용 문자: A-Za-z0-9!#$&+-.^_`|~
            // 따라서 '()', '*', "'", '%', '"', ';', '\', '/' 등은 인코딩해야 함
            const encodedFilename = encodeURIComponent(downloadFilename)
                .replace(/['()!~*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()); // 특수문자 수동 인코딩

            // ASCII-safe fallback filename (공백을 언더스코어로 변경)
            const asciiFilename = downloadFilename
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // 발음 구별 기호 제거
                .replace(/[^\x00-\x7F]/g, '_') // 비ASCII 문자를 _로 변경
                .replace(/['"]/g, '') // 따옴표 제거
                .substring(0, 100); // 길이 제한

            const dispositionHeader = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
            console.log('[Storage] Content-Disposition:', dispositionHeader);

            res.setHeader('Content-Disposition', dispositionHeader);
            res.setHeader('Content-Type', blob.type || 'application/octet-stream');
            res.setHeader('Content-Length', buffer.length);

            // 3. 스트림 전송
            res.send(buffer);
        } catch (error: any) {
            console.error("Proxy Download error:", error);
            res.status(500).send("Download failed");
        }
    });

    // 테스트용 엔드포인트 - Content-Disposition 헤더 확인
    router.get("/test-download", async (req, res) => {
        const testFilename = "스크린샷 2026-01-17 15.31.12.png";
        const testContent = "테스트 파일 내용";

        const encodedFilename = encodeURIComponent(testFilename);
        const asciiFilename = testFilename
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\x00-\x7F]/g, '_')
            .replace(/['"]/g, '')
            .substring(0, 100);

        const dispositionHeader = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
        console.log('[Test] Content-Disposition:', dispositionHeader);

        res.setHeader('Content-Disposition', dispositionHeader);
        res.setHeader('Content-Type', 'text/plain');
        res.send(testContent);
    });

    app.use("/api/storage", router);
}
