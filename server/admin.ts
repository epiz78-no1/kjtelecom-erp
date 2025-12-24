import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth, requireTenant, requireAdmin } from "./middleware/auth";
import { insertPositionSchema, insertInvitationSchema } from "@shared/schema";
import { randomBytes } from "crypto";

export function registerAdminRoutes(app: Express) {
    // Base path for admin routes
    const adminRouter = "/api/admin";

    // Members Management
    app.get(`${adminRouter}/members`, requireAuth, requireTenant, requireAdmin, async (req, res) => {
        try {
            const tenantId = req.session!.tenantId!;
            const members = await storage.getMembers(tenantId);
            res.json(members);
        } catch (error) {
            console.error("Fetch members error:", error);
            res.status(500).json({ error: "멤버 목록을 가져오는 중 오류가 발생했습니다" });
        }
    });

    app.patch(`${adminRouter}/members/:userId`, requireAuth, requireTenant, requireAdmin, async (req, res) => {
        try {
            const { userId } = req.params;
            const tenantId = req.session!.tenantId!;
            const updated = await storage.updateMember(userId, tenantId, req.body);
            if (!updated) {
                return res.status(404).json({ error: "멤버를 찾을 수 없습니다" });
            }
            res.json(updated);
        } catch (error) {
            console.error("Update member error:", error);
            res.status(500).json({ error: "멤버 정보를 수정하는 중 오류가 발생했습니다" });
        }
    });

    app.delete(`${adminRouter}/members/:userId`, requireAuth, requireTenant, requireAdmin, async (req, res) => {
        try {
            const { userId } = req.params;
            const tenantId = req.session!.tenantId!;
            const success = await storage.deleteMember(userId, tenantId);
            if (!success) {
                return res.status(404).json({ error: "멤버를 찾을 수 없습니다" });
            }
            res.status(204).send();
        } catch (error) {
            console.error("Delete member error:", error);
            res.status(500).json({ error: "멤버를 삭제하는 중 오류가 발생했습니다" });
        }
    });

    // Positions Management
    app.get(`${adminRouter}/positions`, requireAuth, requireTenant, async (req, res) => {
        try {
            const tenantId = req.session!.tenantId!;
            const positions = await storage.getPositions(tenantId);
            res.json(positions);
        } catch (error) {
            console.error("Fetch positions error:", error);
            res.status(500).json({ error: "직급 목록을 가져오는 중 오류가 발생했습니다" });
        }
    });

    app.post(`${adminRouter}/positions`, requireAuth, requireTenant, requireAdmin, async (req, res) => {
        try {
            const tenantId = req.session!.tenantId!;
            const parseResult = insertPositionSchema.safeParse({ ...req.body, tenantId });
            if (!parseResult.success) {
                return res.status(400).json({ error: parseResult.error.message });
            }
            const position = await storage.createPosition(parseResult.data);
            res.status(201).json(position);
        } catch (error) {
            console.error("Create position error:", error);
            res.status(500).json({ error: "직급을 생성하는 중 오류가 발생했습니다" });
        }
    });

    app.patch(`${adminRouter}/positions/:id`, requireAuth, requireTenant, requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = req.session!.tenantId!;
            const updated = await storage.updatePosition(id, req.body, tenantId);
            if (!updated) {
                return res.status(404).json({ error: "직급을 찾을 수 없습니다" });
            }
            res.json(updated);
        } catch (error) {
            console.error("Update position error:", error);
            res.status(500).json({ error: "직급을 수정하는 중 오류가 발생했습니다" });
        }
    });

    app.delete(`${adminRouter}/positions/:id`, requireAuth, requireTenant, requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = req.session!.tenantId!;
            const success = await storage.deletePosition(id, tenantId);
            if (!success) {
                return res.status(404).json({ error: "직급을 찾을 수 없습니다" });
            }
            res.status(204).send();
        } catch (error) {
            console.error("Delete position error:", error);
            res.status(500).json({ error: "직급을 삭제하는 중 오류가 발생했습니다" });
        }
    });

    // Invitations Management
    app.get(`${adminRouter}/invitations`, requireAuth, requireTenant, requireAdmin, async (req, res) => {
        try {
            const tenantId = req.session!.tenantId!;
            const invitations = await storage.getInvitations(tenantId);
            res.json(invitations);
        } catch (error) {
            console.error("Fetch invitations error:", error);
            res.status(500).json({ error: "초대 목록을 가져오는 중 오류가 발생했습니다" });
        }
    });

    app.post(`${adminRouter}/invitations`, requireAuth, requireTenant, requireAdmin, async (req, res) => {
        try {
            const tenantId = req.session!.tenantId!;
            const userId = req.session!.userId!;

            const { email, role } = req.body;
            const token = randomBytes(32).toString("hex");
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

            const invitation = await storage.createInvitation({
                tenantId,
                email,
                role: role || "member",
                token,
                expiresAt,
                invitedBy: userId,
                status: "pending"
            });

            res.status(201).json(invitation);
        } catch (error) {
            console.error("Create invitation error:", error);
            res.status(500).json({ error: "초대를 생성하는 중 오류가 발생했습니다" });
        }
    });

    app.delete(`${adminRouter}/invitations/:id`, requireAuth, requireTenant, requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = req.session!.tenantId!;
            const success = await storage.deleteInvitation(id, tenantId);
            if (!success) {
                return res.status(404).json({ error: "초대를 찾을 수 없습니다" });
            }
            res.status(204).send();
        } catch (error) {
            console.error("Delete invitation error:", error);
            res.status(500).json({ error: "초대를 삭제하는 중 오류가 발생했습니다" });
        }
    });
}
