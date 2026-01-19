import type { Express } from "express";
import { storage } from "../storage.js";
import { apiInsertDemolitionMaterialSchema, apiInsertDemolitionMaterialLogSchema } from "../../shared/schema.js";
import { requireAuth, requireTenant, requireAdmin } from "../middleware/auth.js";
import { processAttachments } from "./inventory-helpers.js";

export function registerDemolitionRoutes(app: Express) {
    // 철거자재 목록 조회
    app.get("/api/demolition-materials", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const materials = await storage.getDemolitionMaterials(tenantId);
        res.json(materials);
    });

    // 철거자재 상세 조회
    app.get("/api/demolition-materials/:id", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const tenantId = req.session!.tenantId!;
        const material = await storage.getDemolitionMaterial(id, tenantId);
        if (!material) return res.status(404).json({ error: "Material not found" });
        res.json(material);
    });

    // 철거자재 입고 등록 (현장팀 + 관리자)
    app.post("/api/demolition-materials", requireAuth, requireTenant, async (req, res) => {
        const parseResult = apiInsertDemolitionMaterialSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.message });
        }
        const tenantId = req.session!.tenantId!;

        // 첨부파일 처리
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
                console.error('[DEMOLITION CREATE] Attachment processing error:', e);
            }
        }

        try {
            // 관리번호 자동생성
            const managementNo = await storage.generateDemolitionManagementNo(tenantId);

            const material = await storage.createDemolitionMaterial({
                ...parseResult.data,
                managementNo,
                attributes: Object.keys(attributesObj).length > 0 ? JSON.stringify(attributesObj) : parseResult.data.attributes,
                remainingQuantity: parseResult.data.remainingQuantity ?? parseResult.data.originalQuantity,
                tenantId,
                createdBy: req.session!.userId!
            }, tenantId);

            res.status(201).json(material);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 철거자재 수정
    app.patch("/api/demolition-materials/:id", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const parseResult = apiInsertDemolitionMaterialSchema.partial().safeParse(req.body);

        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.message });
        }

        const tenantId = req.session!.tenantId!;

        // 첨부파일 처리
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
                console.error('[DEMOLITION UPDATE] Attachment processing error:', e);
            }
        }

        try {
            const updates = { ...parseResult.data };
            if (Object.keys(attributesObj).length > 0) {
                updates.attributes = JSON.stringify(attributesObj);
            }

            const material = await storage.updateDemolitionMaterial(id, updates, tenantId);
            if (!material) {
                return res.status(404).json({ error: "Material not found" });
            }
            res.json(material);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 검토 처리 (관리자 전용)
    app.post("/api/demolition-materials/:id/review", requireAuth, requireTenant, requireAdmin, async (req, res) => {
        const { id } = req.params;
        const { decision, note, condition } = req.body; // decision: 'approved' | 'rejected'
        const tenantId = req.session!.tenantId!;
        const userId = req.session!.userId!;

        try {
            const material = await storage.getDemolitionMaterial(id, tenantId);
            if (!material) {
                return res.status(404).json({ error: "Material not found" });
            }

            // 상태 업데이트
            const newStatus = decision === 'approved' ? 'approved_reusable' : 'rejected';
            const updated = await storage.updateDemolitionMaterial(id, {
                status: newStatus,
                reusable: decision === 'approved',
                condition: condition || material.condition,
                reviewedBy: userId,
                reviewedAt: new Date(),
                reviewNote: note
            }, tenantId);

            // 검토 로그 생성
            await storage.createDemolitionMaterialLog({
                materialId: id,
                logType: 'review',
                reviewDecision: decision,
                reviewNote: note,
                logDate: new Date().toISOString().split('T')[0],
                tenantId,
                createdBy: userId
            }, tenantId);

            res.json(updated);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 폐기 처리 (관리자 전용)
    app.post("/api/demolition-materials/:id/dispose", requireAuth, requireTenant, requireAdmin, async (req, res) => {
        const { id } = req.params;
        const { reason, method, quantity } = req.body;
        const tenantId = req.session!.tenantId!;
        const userId = req.session!.userId!;

        try {
            const material = await storage.getDemolitionMaterial(id, tenantId);
            if (!material) {
                return res.status(404).json({ error: "Material not found" });
            }

            const disposeQuantity = quantity || material.remainingQuantity;
            const newRemaining = material.remainingQuantity - disposeQuantity;
            const newWaste = material.wasteQuantity + disposeQuantity;

            // 상태 업데이트
            const updated = await storage.updateDemolitionMaterial(id, {
                remainingQuantity: newRemaining,
                wasteQuantity: newWaste,
                status: newRemaining === 0 ? 'disposed' : material.status
            }, tenantId);

            // 폐기 로그 생성
            await storage.createDemolitionMaterialLog({
                materialId: id,
                logType: 'dispose',
                disposeReason: reason,
                disposeMethod: method,
                usedQuantity: disposeQuantity,
                beforeQuantity: material.remainingQuantity,
                afterQuantity: newRemaining,
                logDate: new Date().toISOString().split('T')[0],
                tenantId,
                createdBy: userId
            }, tenantId);

            res.json(updated);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 이력 조회
    app.get("/api/demolition-materials/:id/logs", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const tenantId = req.session!.tenantId!;
        const logs = await storage.getDemolitionMaterialLogs(id, tenantId);
        res.json(logs);
    });

    // 전체 이력 조회
    app.get("/api/demolition-logs", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const type = req.query.type as string | undefined;
        const teamId = req.query.teamId as string | undefined;

        const result = await storage.getAllDemolitionMaterialLogs(tenantId, { type, teamId });
        res.json(result);
    });

    // 사용 등록 (재사용)
    app.post("/api/demolition-materials/:id/usage", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const parseResult = apiInsertDemolitionMaterialLogSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.message });
        }

        const tenantId = req.session!.tenantId!;

        try {
            const material = await storage.getDemolitionMaterial(id, tenantId);
            if (!material) {
                return res.status(404).json({ error: "Material not found" });
            }

            if (material.status !== 'approved_reusable' && material.status !== 'in_use') {
                return res.status(400).json({ error: "재사용 가능한 자재가 아닙니다" });
            }

            const usedQty = parseResult.data.usedQuantity || 0;
            if (usedQty > material.remainingQuantity) {
                return res.status(400).json({ error: "사용량이 잔량을 초과합니다" });
            }

            // 수량 업데이트
            const newRemaining = material.remainingQuantity - usedQty;
            const newUsed = material.usedQuantity + usedQty;

            await storage.updateDemolitionMaterial(id, {
                remainingQuantity: newRemaining,
                usedQuantity: newUsed,
                status: newRemaining === 0 ? 'disposed' : 'in_use',
                currentTeamId: parseResult.data.teamId || material.currentTeamId
            }, tenantId);

            // 사용 로그 생성
            const log = await storage.createDemolitionMaterialLog({
                ...parseResult.data,
                materialId: id,
                logType: parseResult.data.logType || 'usage',
                beforeQuantity: material.remainingQuantity,
                afterQuantity: newRemaining,
                tenantId,
                createdBy: req.session!.userId
            }, tenantId);

            res.json(log);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 대시보드 데이터
    app.get("/api/demolition-dashboard", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const data = await storage.getDemolitionDashboard(tenantId);
        res.json(data);
    });
    // 로그 수정 (사용/폐기 등)
    app.patch("/api/demolition-logs/:id", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const tenantId = req.session!.tenantId!;
        const parseResult = apiInsertDemolitionMaterialLogSchema.partial().safeParse(req.body);

        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.message });
        }

        try {
            const updated = await storage.updateDemolitionMaterialLog(id, parseResult.data, tenantId);
            if (!updated) {
                return res.status(404).json({ error: "Log not found" });
            }
            res.json(updated);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 로그 삭제
    app.delete("/api/demolition-logs/:id", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const tenantId = req.session!.tenantId!;

        try {
            const success = await storage.deleteDemolitionMaterialLog(id, tenantId);
            if (!success) {
                return res.status(404).json({ error: "Log not found" });
            }
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 로그 일괄 삭제
    app.post("/api/demolition-logs/bulk-delete", requireAuth, requireTenant, async (req, res) => {
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ error: "IDs must be an array" });
        }

        const tenantId = req.session!.tenantId!;
        try {
            const deletedCount = await storage.bulkDeleteDemolitionMaterialLogs(ids, tenantId);
            res.json({ deletedCount });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });
}
