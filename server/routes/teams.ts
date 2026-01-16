import type { Express } from "express";
import { storage } from "../storage.js";
import { apiInsertTeamSchema } from "../../shared/schema.js";
import { requireAuth, requireTenant, requireAdmin } from "../middleware/auth.js";

export function registerTeamsRoutes(app: Express) {
    // Divisions API
    app.get("/api/divisions", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const result = await storage.getDivisions(tenantId);
        res.json(result);
    });

    app.post("/api/divisions", requireAuth, requireTenant, async (req, res) => {
        const { name } = req.body;

        if (!name || typeof name !== "string") {
            return res.status(400).json({ error: "Name is required" });
        }

        const tenantId = req.session!.tenantId!;
        const division = await storage.createDivision(name, tenantId);
        res.status(201).json(division);
    });

    app.patch("/api/divisions/:id", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || typeof name !== "string") {
            return res.status(400).json({ error: "Name is required" });
        }

        const tenantId = req.session!.tenantId!;
        const division = await storage.updateDivision(id, name, tenantId);

        if (!division) {
            return res.status(404).json({ error: "Division not found" });
        }
        res.json(division);
    });

    app.delete("/api/divisions/:id", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const tenantId = req.session!.tenantId!;

        const success = await storage.deleteDivision(id, tenantId);

        if (!success) {
            return res.status(404).json({ error: "Division not found" });
        }

        res.status(204).send();
    });

    // Teams API
    app.get("/api/teams", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const { divisionId } = req.query;

        let teamList;
        if (divisionId && typeof divisionId === "string") {
            teamList = await storage.getTeamsByDivision(divisionId, tenantId);
        } else {
            teamList = await storage.getTeams(tenantId);
        }

        const divisionList = await storage.getDivisions(tenantId);
        const divisionMap = new Map(divisionList.map(d => [d.id, d.name]));

        // Fetch members to calculate memberCount for each team
        const members = await storage.getMembers(tenantId);

        const usageRecords = await storage.getMaterialUsageRecords(tenantId);
        const outgoingRecords = await storage.getOutgoingRecords(tenantId);
        const opticalLogs = await storage.getAllOpticalCableLogs(tenantId);

        console.log(`[TEAM ACTIVITY DEBUG] Total teams: ${teamList.length}, Usage: ${usageRecords.length}, Outgoing: ${outgoingRecords.length}, OpticalLogs: ${opticalLogs.length}`);

        const teamsWithDetails = teamList.map(team => {
            const teamUsage = usageRecords.filter(r =>
                r.teamId === team.id || (!r.teamId && r.teamCategory === team.name)
            );

            const teamOutgoing = outgoingRecords.filter(r =>
                r.teamId === team.id || (!r.teamId && r.teamCategory === team.name)
            );

            // 광케이블 관련 로그 (해당 팀이 수행한 불출, 사용, 반납, 폐기)
            const teamOpticalLogs = opticalLogs.filter(log =>
                log.teamId === team.id &&
                ['assign', 'usage', 'return', 'waste'].includes(log.logType)
            );

            let lastActivity = team.lastActivity;

            // 1. 일반 자재 사용 내역
            if (teamUsage.length > 0) {
                const latestUsage = teamUsage.reduce((latest, current) => {
                    return new Date(current.date) > new Date(latest.date) ? current : latest;
                });

                if (!lastActivity || new Date(latestUsage.date) > new Date(lastActivity)) {
                    lastActivity = latestUsage.date;
                }
            }

            // 2. 일반 자재 출고 내역
            if (teamOutgoing.length > 0) {
                const latestOutgoing = teamOutgoing.reduce((latest, current) => {
                    return new Date(current.date) > new Date(latest.date) ? current : latest;
                });

                if (!lastActivity || new Date(latestOutgoing.date) > new Date(lastActivity)) {
                    lastActivity = latestOutgoing.date;
                }
            }

            // 3. 광케이블 활동 내역 (usageDate 기준)
            if (teamOpticalLogs.length > 0) {
                const latestOptical = teamOpticalLogs.reduce((latest, current) => {
                    // usageDate가 있으면 그것을, 없으면 createdAt을 사용 (createdAt은 Date 객체일 수 있음)
                    const dateA = new Date(latest.usageDate || latest.createdAt);
                    const dateB = new Date(current.usageDate || current.createdAt);
                    return dateB > dateA ? current : latest;
                });

                const latestDate = new Date(latestOptical.usageDate || latestOptical.createdAt).toISOString().split('T')[0];

                if (!lastActivity || new Date(latestDate) > new Date(lastActivity)) {
                    lastActivity = latestDate;
                }
            }

            // Calculate memberCount for this team
            const memberCount = members.filter(m => m.teamId === team.id).length;

            return {
                ...team,
                divisionName: divisionMap.get(team.divisionId) || "",
                memberCount,
                lastActivity
            };
        });

        res.json(teamsWithDetails);
    });

    app.post("/api/teams", requireAuth, requireTenant, async (req, res) => {
        const parseResult = apiInsertTeamSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.message });
        }

        const tenantId = req.session!.tenantId!;
        const { memberIds } = req.body;

        const team = await storage.createTeam({
            ...parseResult.data,
            tenantId
        }, memberIds);

        const division = await storage.getDivision(team.divisionId, tenantId);

        res.status(201).json({
            ...team,
            divisionName: division?.name || "",
        });
    });

    app.patch("/api/teams/:id", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const { memberIds, ...updates } = req.body;
        const tenantId = req.session!.tenantId!;

        const team = await storage.updateTeam(id, updates, tenantId, memberIds);

        if (!team) {
            return res.status(404).json({ error: "Team not found" });
        }

        const division = await storage.getDivision(team.divisionId, tenantId);

        res.json({
            ...team,
            divisionName: division?.name || "",
        });
    });

    app.delete("/api/teams/:id", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const tenantId = req.session!.tenantId!;

        const success = await storage.deleteTeam(id, tenantId);

        if (!success) {
            return res.status(404).json({ error: "Team not found" });
        }
        res.status(204).send();
    });

    // Public Member List
    app.get("/api/members/basic", requireAuth, requireTenant, async (req, res) => {
        try {
            const tenantId = req.session!.tenantId!;
            const members = await storage.getMembers(tenantId);
            res.json(members);
        } catch (error) {
            console.error("Fetch basic members error:", error);
            res.status(500).json({ error: "멤버 목록을 가져오는 중 오류가 발생했습니다" });
        }
    });

    // Admin Members
    app.get("/api/admin/members", requireAuth, requireTenant, requireAdmin, async (req, res) => {
        try {
            const tenantId = req.session!.tenantId!;
            const members = await storage.getMembers(tenantId);
            res.json(members);
        } catch (error) {
            console.error("Fetch admin members error:", error);
            res.status(500).json({ error: "멤버 목록을 가져오는 중 오류가 발생했습니다" });
        }
    });

    app.patch("/api/admin/members/:userId", requireAuth, requireTenant, requireAdmin, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const { userId } = req.params;
        const updates = req.body;

        try {
            const updatedMember = await storage.updateMember(userId, tenantId, updates);
            if (!updatedMember) {
                return res.status(404).json({ error: "Member not found" });
            }
            res.json(updatedMember);
        } catch (error) {
            console.error("[MEMBER UPDATE] Error:", error);
            res.status(500).json({ error: "멤버 정보 업데이트 중 오류가 발생했습니다" });
        }
    });

    app.patch("/api/admin/members/:userId/permissions", requireAuth, requireTenant, requireAdmin, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const { userId } = req.params;
        const { permissions } = req.body;

        if (!permissions) {
            return res.status(400).json({ error: "Permissions are required" });
        }

        try {
            const updatedMember = await storage.updateMember(userId, tenantId, { permissions });
            res.json(updatedMember);
        } catch (error) {
            console.error("Update permissions error:", error);
            res.status(500).json({ error: "권한 업데이트 중 오류가 발생했습니다" });
        }
    });

    // Positions API
    app.get("/api/admin/positions", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const positions = await storage.getPositions(tenantId);
        res.json(positions);
    });

    app.post("/api/admin/positions", requireAuth, requireTenant, async (req, res) => {
        const { name, rankOrder } = req.body;

        if (!name || typeof name !== "string") {
            return res.status(400).json({ error: "Name is required" });
        }

        const tenantId = req.session!.tenantId!;
        const position = await storage.createPosition({
            name,
            rankOrder: rankOrder || 0,
            tenantId
        });

        res.status(201).json(position);
    });

    app.patch("/api/admin/positions/:id", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const updates = req.body;

        const tenantId = req.session!.tenantId!;
        const position = await storage.updatePosition(id, updates, tenantId);

        if (!position) {
            return res.status(404).json({ error: "Position not found" });
        }

        res.json(position);
    });

    app.delete("/api/admin/positions/:id", requireAuth, requireTenant, async (req, res) => {
        const { id } = req.params;
        const tenantId = req.session!.tenantId!;

        const success = await storage.deletePosition(id, tenantId);

        if (!success) {
            return res.status(404).json({ error: "Position not found" });
        }

        res.status(204).send();
    });
}
