import type { Express } from "express";
import { storage } from "../storage.js";
import { apiInsertOpticalCableSchema, apiInsertOpticalCableLogSchema, opticalCables } from "../../shared/schema.js";
import { requireAuth, requireTenant, requireAdmin } from "../middleware/auth.js";
import { processAttachments } from "./inventory-helpers.js";
import { db } from "../db.js";
import { eq, and } from "drizzle-orm";

export function registerOpticalRoutes(app: Express) {
    // Optical Cable Management API
    app.get("/api/optical-cables", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const cables = await storage.getOpticalCables(tenantId);
        res.json(cables);
    });

    app.get("/api/optical-cables/logs", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const type = req.query.type as string | undefined;
        const teamId = req.query.teamId as string | undefined;

        const result = await storage.getAllOpticalCableLogs(tenantId, { type, teamId });
        res.json(result);
    });

    app.get("/api/optical-cables/logs/:id", requireAuth, requireTenant, async (req, res) => {
        try {
            const tenantId = req.session!.tenantId!;
            const logId = req.params.id;
            console.log(`[GET /logs/:id] Fetching log ${logId} for tenant ${tenantId}`);

            const log = await storage.getOpticalCableLog(logId, tenantId);

            if (!log) {
                console.log(`[GET /logs/:id] Log not found: ${logId}`);
                return res.status(404).json({ error: "Log not found" });
            }

            console.log(`[GET /logs/:id] Log found, attributes size: ${JSON.stringify(log.attributes || {}).length} bytes`);
            res.json(log);
        } catch (error: any) {
            console.error(`[GET /logs/:id] Error:`, error);
            res.status(500).json({ error: error.message || "Failed to fetch log" });
        }
    });

    app.get("/api/optical-cables/:id", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const tenantId = req.session!.tenantId!;
        const cable = await storage.getOpticalCable(id, tenantId);
        if (!cable) return res.status(404).json({ error: "Cable not found" });
        res.json(cable);
    });

    app.post("/api/optical-cables", requireAuth, requireTenant, async (req, res) => {
        const parseResult = apiInsertOpticalCableSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.message });
        }
        const tenantId = req.session!.tenantId!;

        // Process attachments
        let attributesObj: any = {};
        if (parseResult.data.attributes) {
            try {
                const attrs = typeof parseResult.data.attributes === 'string'
                    ? JSON.parse(parseResult.data.attributes)
                    : parseResult.data.attributes;

                if (attrs.attachments && Array.isArray(attrs.attachments)) {
                    const uploadedFiles = await processAttachments(attrs.attachments);
                    attributesObj.attachments = uploadedFiles;
                    attributesObj.attachment = uploadedFiles[0];
                } else if (attrs.attachment) {
                    const uploadedFiles = await processAttachments([attrs.attachment]);
                    attributesObj.attachment = uploadedFiles[0];
                }
            } catch (e) {
                console.error('[OPTICAL CREATE] Attachment processing error:', e);
            }
        }

        const { isWaste, wasteReason, wasteLength } = req.body;

        try {
            const cable = await storage.createOpticalCable({
                ...parseResult.data,
                attributes: Object.keys(attributesObj).length > 0 ? JSON.stringify(attributesObj) : parseResult.data.attributes,
                // productName이 숫자일 경우를 대비해 변환, 하지만 remainingLength가 필수라면 클라이언트에서 보내야 함.
                // 스키마에 remainingLength가 optional로 되어있으므로 여기서 초기값 설정 필요.
                // 단, productName은 이제 'Spec+Core' 스트링일 수 있으므로 numeric parsing 주의.
                // 만약 remainingLength가 없으면 0으로 초기화 (parseResult.data.remainingLength가 없으면)
                remainingLength: parseResult.data.remainingLength ?? 0,
                tenantId,
                createdBy: req.session!.userId!
            }, tenantId, { isWaste, wasteReason, wasteLength });
            res.status(201).json(cable);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.patch("/api/optical-cables/:id", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;


        const parseResult = apiInsertOpticalCableSchema.partial().safeParse(req.body);

        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.message });
        }

        const tenantId = req.session!.tenantId!;
        // Process attachments for update if present
        let attributesObj: any = {};
        if (parseResult.data.attributes) {
            try {
                const attrs = typeof parseResult.data.attributes === 'string'
                    ? JSON.parse(parseResult.data.attributes)
                    : parseResult.data.attributes;

                if (attrs.attachments && Array.isArray(attrs.attachments)) {
                    const uploadedFiles = await processAttachments(attrs.attachments);
                    attributesObj.attachments = uploadedFiles;
                    attributesObj.attachment = uploadedFiles[0];
                } else if (attrs.attachment) {
                    const uploadedFiles = await processAttachments([attrs.attachment]);
                    attributesObj.attachment = uploadedFiles[0];
                }
            } catch (e) {
                console.error('[OPTICAL UPDATE] Attachment processing error:', e);
            }
        }

        try {
            const updates = { ...parseResult.data };
            if (Object.keys(attributesObj).length > 0) {
                updates.attributes = JSON.stringify(attributesObj);
            }

            const cable = await storage.updateOpticalCable(id, updates, tenantId);
            if (!cable) {
                return res.status(404).json({ error: "Cable not found" });
            }
            res.json(cable);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post("/api/optical-cables/bulk", requireAuth, requireTenant, async (req, res) => {
        const { items } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: "Items must be an array" });
        }

        const tenantId = req.session!.tenantId!;

        try {
            // Process attachments for each item in bulk
            const processedItems = await Promise.all(items.map(async (item) => {
                let attributesObj: any = {};
                if (item.attributes) {
                    try {
                        const attrs = typeof item.attributes === 'string'
                            ? JSON.parse(item.attributes)
                            : item.attributes;

                        if (attrs.attachments && Array.isArray(attrs.attachments)) {
                            const uploadedFiles = await processAttachments(attrs.attachments);
                            attributesObj.attachments = uploadedFiles;
                            attributesObj.attachment = uploadedFiles[0];
                        } else if (attrs.attachment) {
                            const uploadedFiles = await processAttachments([attrs.attachment]);
                            attributesObj.attachment = uploadedFiles[0];
                        }
                    } catch (e) {
                        console.error('[OPTICAL BULK CREATE] Attachment processing error:', e);
                    }
                }

                return {
                    ...item,
                    createdBy: req.session!.userId!, // Inject creator ID
                    attributes: Object.keys(attributesObj).length > 0 ? JSON.stringify(attributesObj) : item.attributes
                };
            }));

            const cables = await storage.createOpticalCablesBulk(processedItems, tenantId);
            res.status(201).json(cables);
        } catch (error: any) {
            console.error("Bulk optical cable upload error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post("/api/optical-cables/bulk-delete", requireAuth, requireTenant, requireAdmin, async (req, res) => {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: "삭제할 항목을 선택해주세요" });
            }

            await storage.bulkDeleteOpticalCables(ids, req.session!.tenantId!);
            res.json({ success: true, message: "삭제되었습니다" });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post("/api/optical-cables/logs/bulk-delete", requireAuth, requireTenant, requireAdmin, async (req, res) => {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: "삭제할 항목을 선택해주세요" });
            }

            await storage.bulkDeleteOpticalCableLogs(ids, req.session!.tenantId!);
            res.json({ success: true, message: "삭제되었습니다" });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post("/api/optical-cables/:id/log", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const parseResult = apiInsertOpticalCableLogSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.message });
        }
        const tenantId = req.session!.tenantId!;
        try {
            // cableId는 URL param이 우선하도록 설정 (혹은 body와 일치 확인)
            const cable = await storage.createOpticalCableLog({
                ...parseResult.data,
                cableId: id,
                tenantId,
                createdBy: req.session!.userId
            }, tenantId);
            res.json(cable);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post("/api/optical-cables/:id/usage", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        // usage 전용 라우트지만 스키마는 동일하게 사용 (단, logType은 무시하고 서버에서 'usage'로 강제)
        const parseResult = apiInsertOpticalCableLogSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.message });
        }

        const tenantId = req.session!.tenantId!;
        const requestReturn = req.body.requestReturn === true; // 반납 요청 여부

        try {
            const cable = await storage.createOpticalCableLog({
                ...parseResult.data,
                cableId: id,
                logType: "usage", // 강제 설정
                tenantId,
                createdBy: req.session!.userId
            }, tenantId);

            // 반납 요청이 있는 경우 케이블 상태 업데이트
            if (requestReturn) {
                await storage.updateOpticalCable(id, {
                    returnRequestStatus: 'pending',
                    returnRequestedBy: req.session!.userId,
                    returnRequestedAt: new Date()
                }, tenantId);
            }

            res.json(cable);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });



    // 일괄 사용 등록 API
    app.post("/api/optical-cables/usage/bulk", requireAuth, requireTenant, async (req, res) => {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Items must be a non-empty array" });
        }

        const tenantId = req.session!.tenantId!;
        const userId = req.session!.userId!;

        try {
            // 1. 날짜 순으로 정렬 (오래된 날짜부터 처리)
            const sortedItems = [...items].sort((a, b) =>
                new Date(a.usageDate).getTime() - new Date(b.usageDate).getTime()
            );

            // Fetch cables once outside the loop for performance
            const cables = await storage.getOpticalCables(tenantId);

            // 2. 트랜잭션으로 순차 처리
            const results = await db.transaction(async (tx) => {
                const processedLogs = [];

                for (const item of sortedItems) {
                    // 2.1. 드럼 조회 (관리번호 우선, 없으면 제조번호)
                    const cable = cables.find(c => {
                        // 1. 관리번호 매칭
                        if (item.managementNo) {
                            if (c.managementNo === item.managementNo.trim()) {
                                // 상태 및 팀 체크
                                if (c.status !== 'assigned') return false;
                                if (item.teamId && c.currentTeamId !== item.teamId) return false;
                                return true;
                            }
                            return false;
                        }

                        // 2. 제조번호 매칭
                        // 기본 조건: 제조번호, 출고 상태
                        if (c.drumNo !== item.drumNo || c.status !== 'assigned') return false;
                        // 팀 체크: teamId가 있을 때만 (현장팀), 없으면 스킵 (관리자)
                        if (item.teamId && c.currentTeamId !== item.teamId) return false;
                        return true;
                    });

                    if (!cable) {
                        throw new Error(`제조번호 '${item.drumNo}'를 찾을 수 없거나 출고 상태가 아닙니다`);
                    }

                    // 2.2. 잔량 검증
                    const totalUsed = (item.installLength || 0) + (item.wasteLength || 0);
                    if (totalUsed > cable.remainingLength) {
                        throw new Error(`제조번호 '${item.drumNo}': 사용량(${totalUsed}m)이 잔량(${cable.remainingLength}m)을 초과합니다`);
                    }

                    // 2.3. 사용 로그 생성 (기존 API 재사용)
                    const log = await storage.createOpticalCableLog({
                        cableId: cable.id,
                        logType: "usage",
                        teamId: item.teamId || cable.currentTeamId, // item.teamId가 없으면 케이블의 현재 팀 사용
                        usageDate: item.usageDate,
                        installLength: item.installLength || 0,
                        wasteLength: item.wasteLength || 0,
                        projectCode: item.projectCode,
                        projectNameUsage: item.projectNameUsage,
                        workerName: item.workerName,
                        tenantId,
                        createdBy: userId
                    }, tenantId);

                    // 중요: 메모리 상의 케이블 잔량도 업데이트하여, 같은 배치 내 중복 사용 시 검증 정확도 유지
                    if (cable.remainingLength !== undefined) {
                        cable.remainingLength -= totalUsed;
                    }
                    if (cable.usedLength !== undefined) {
                        cable.usedLength += totalUsed;
                    }

                    processedLogs.push(log);
                }

                return processedLogs;
            });

            res.status(201).json({
                success: true,
                count: results.length,
                message: `${results.length}건의 사용 내역이 등록되었습니다`
            });
        } catch (error: any) {
            console.error("Bulk optical cable usage error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    app.get("/api/optical-cables/:id/logs", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const tenantId = req.session!.tenantId!;
        const logs = await storage.getOpticalCableLogs(id, tenantId);
        res.json(logs);
    });

    app.patch("/api/optical-cables/logs/:id", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const tenantId = req.session!.tenantId!;
        try {
            const log = await storage.updateOpticalCableLog(id, req.body, tenantId);
            if (!log) {
                return res.status(404).json({ error: "Log not found" });
            }
            res.json(log);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete("/api/optical-cables/logs/:id", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const tenantId = req.session!.tenantId!;
        console.log(`[API DELETE] Received request to delete log: ${id} for tenant: ${tenantId}`);
        try {
            const success = await storage.deleteOpticalCableLog(id, tenantId);
            if (!success) {
                console.log(`[API DELETE] Log not found: ${id}`);
                return res.status(404).json({ error: "Log not found" });
            }
            console.log(`[API DELETE] Successfully deleted log: ${id}`);
            res.status(204).send();
        } catch (error: any) {
            console.error(`[API DELETE] Error deleting log ${id}:`, error);
            res.status(500).json({ error: error.message });
        }
    });
    app.post("/api/optical-cables/:id/reserve", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const { action, project } = req.body; // action: 'reserve' | 'release'
        const tenantId = req.session!.tenantId!;

        try {
            if (action === 'reserve') {
                if (!project) return res.status(400).json({ error: "예약할 공사명을 입력해주세요" });
                const cable = await storage.updateCableReservation(
                    id,
                    'reserve',
                    project,
                    req.session!.userId!,
                    tenantId
                );
                res.json(cable);
            } else if (action === 'release') {
                const cable = await storage.updateCableReservation(
                    id,
                    'release',
                    undefined,
                    req.session!.userId!,
                    tenantId
                );
                res.json(cable);
            } else {
                return res.status(400).json({ error: "Invalid action" });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 반납 요청 API (현장팀용)
    // 주의: 반납 로그는 승인 시에만 생성됩니다. 신청 시에는 returnRequestStatus만 변경합니다.
    app.post("/api/optical-cables/:id/request-return", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const tenantId = req.session!.tenantId!;

        try {
            const cable = await storage.updateOpticalCable(id, {
                returnRequestStatus: 'pending',
                returnRequestedBy: req.session!.userId,
                returnRequestedAt: new Date()
            }, tenantId);
            res.json(cable);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 반납 승인/반려 API
    app.post("/api/optical-cables/:id/approve-return", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const { action } = req.body; // action: 'approve' | 'reject'
        const tenantId = req.session!.tenantId!;
        const userId = req.session!.userId!;

        try {
            if (action === 'approve') {
                // 1. 기존 케이블 정보 조회 (팀 정보 확인용)
                const existingCable = await storage.getOpticalCable(id, tenantId);
                if (!existingCable) {
                    return res.status(404).json({ error: "Cable not found" });
                }

                // 2. 승인: 자재실로 복귀 처리
                const cable = await storage.updateOpticalCable(id, {
                    status: 'in_stock',
                    currentTeamId: null,
                    returnRequestStatus: 'approved',
                    returnApprovedBy: userId,
                    returnApprovedAt: new Date()
                }, tenantId);

                // 3. 반납 로그 생성
                await storage.createOpticalCableLog({
                    cableId: id,
                    logType: 'return',
                    teamId: existingCable.currentTeamId, // 반납한 팀
                    usageDate: new Date().toISOString().split('T')[0], // 반납일 (YYYY-MM-DD)
                    tenantId,
                    createdBy: userId
                }, tenantId);

                res.json(cable);
            } else if (action === 'reject') {
                // 반려: 반납 요청만 취소
                const cable = await storage.updateOpticalCable(id, {
                    returnRequestStatus: 'rejected',
                    returnApprovedBy: userId,
                    returnApprovedAt: new Date()
                }, tenantId);
                res.json(cable);
            } else {
                return res.status(400).json({ error: "Invalid action" });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 일괄 출고 등록 API
    app.post("/api/optical-cables/bulk-assign", requireAuth, requireTenant, async (req, res) => {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Items must be a non-empty array" });
        }

        const tenantId = req.session!.tenantId!;
        const userId = req.session!.userId!;

        try {
            const results = await storage.bulkAssignOpticalCables(items, tenantId, userId);
            res.status(201).json(results);
        } catch (error: any) {
            console.error("Bulk optical cable assignment error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // 반납 신청 취소 API
    app.post("/api/optical-cables/:id/cancel-return", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const tenantId = req.session!.tenantId!;

        try {
            const cable = await storage.getOpticalCable(id, tenantId);
            if (!cable) {
                return res.status(404).json({ error: "Cable not found" });
            }

            if (cable.returnRequestStatus !== 'pending') {
                return res.status(400).json({ error: "No pending return request to cancel" });
            }

            // 반납 요청 상태만 초기화 ('none'으로 설정)
            await db.update(opticalCables)
                .set({ returnRequestStatus: 'none' })
                .where(and(
                    eq(opticalCables.id, id),
                    eq(opticalCables.tenantId, tenantId)
                ));

            const updated = await storage.getOpticalCable(id, tenantId);
            res.json(updated);
        } catch (error: any) {
            console.error("Cancel return request error:", error);
            res.status(500).json({ error: error.message });
        }
    });
}
