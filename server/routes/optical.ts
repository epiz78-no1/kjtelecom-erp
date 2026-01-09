import type { Express } from "express";
import { storage } from "../storage.js";
import { apiInsertOpticalCableSchema, apiInsertOpticalCableLogSchema } from "../../shared/schema.js";
import { requireAuth, requireTenant, requireAdmin } from "../middleware/auth.js";

export function registerOpticalRoutes(app: Express) {
    // Optical Cable Management API
    app.get("/api/optical-cables", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const cables = await storage.getOpticalCables(tenantId);
        res.json(cables);
    });

    app.get("/api/optical-cables/logs", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const result = await storage.getAllOpticalCableLogs(tenantId);
        res.json(result);
    });

    app.get("/api/optical-cables/logs/:id", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const log = await storage.getOpticalCableLog(req.params.id, tenantId);
        if (!log) return res.status(404).json({ error: "Log not found" });
        res.json(log);
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
        try {
            const cable = await storage.createOpticalCable({
                ...parseResult.data,
                remainingLength: Number(parseResult.data.totalLength),
                tenantId,
                createdBy: req.session!.userId!
            }, tenantId);
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
        try {
            const cable = await storage.updateOpticalCable(id, parseResult.data, tenantId);
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
            const cables = await storage.createOpticalCablesBulk(items, tenantId);
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
        try {
            const cable = await storage.createOpticalCableLog({
                ...parseResult.data,
                cableId: id,
                logType: "usage", // 강제 설정
                tenantId,
                createdBy: req.session!.userId
            }, tenantId);
            res.json(cable);
        } catch (error: any) {
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
        try {
            const success = await storage.deleteOpticalCableLog(id, tenantId);
            if (!success) {
                return res.status(404).json({ error: "Log not found" });
            }
            res.status(204).send();
        } catch (error: any) {
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
                res.status(400).json({ error: "Invalid action" });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });
}
