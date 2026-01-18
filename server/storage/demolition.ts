import { db } from "../db.js";
import { demolitionMaterials, demolitionMaterialLogs, type InsertDemolitionMaterial, type InsertDemolitionMaterialLog } from "../../shared/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

export class DemolitionStorage {
    // 관리번호 자동생성
    async generateDemolitionManagementNo(tenantId: string): Promise<string> {
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2);
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `DM${year}${month}`;

        // 오늘 날짜의 마지막 번호 조회
        const lastMaterial = await db
            .select()
            .from(demolitionMaterials)
            .where(and(
                eq(demolitionMaterials.tenantId, tenantId),
                sql`${demolitionMaterials.managementNo} LIKE ${prefix + '%'}`
            ))
            .orderBy(desc(demolitionMaterials.managementNo))
            .limit(1);

        let sequence = 1;
        if (lastMaterial.length > 0) {
            const lastNo = lastMaterial[0].managementNo;
            const lastSeq = parseInt(lastNo.slice(-4));
            sequence = lastSeq + 1;
        }

        return `${prefix}${sequence.toString().padStart(4, '0')}`;
    }

    // 철거자재 목록 조회
    async getDemolitionMaterials(tenantId: string) {
        return await db.query.demolitionMaterials.findMany({
            where: eq(demolitionMaterials.tenantId, tenantId),
            orderBy: desc(demolitionMaterials.createdAt),
            with: {
                creator: true,
            }
        });
    }

    // 철거자재 상세 조회
    async getDemolitionMaterial(id: string, tenantId: string) {
        const results = await db
            .select()
            .from(demolitionMaterials)
            .where(and(
                eq(demolitionMaterials.id, id),
                eq(demolitionMaterials.tenantId, tenantId)
            ))
            .limit(1);

        return results[0] || null;
    }

    // 철거자재 생성
    async createDemolitionMaterial(data: InsertDemolitionMaterial, tenantId: string) {
        const [material] = await db
            .insert(demolitionMaterials)
            .values({
                ...data,
                tenantId,
            })
            .returning();

        // 입고 로그 자동 생성
        await this.createDemolitionMaterialLog({
            materialId: material.id,
            logType: 'receive',
            logDate: data.demolitionDate || new Date().toISOString().split('T')[0],
            beforeQuantity: 0,
            afterQuantity: material.originalQuantity,
            tenantId,
            createdBy: data.createdBy
        }, tenantId);

        return material;
    }

    // 철거자재 수정
    async updateDemolitionMaterial(id: string, data: Partial<InsertDemolitionMaterial>, tenantId: string) {
        const [updated] = await db
            .update(demolitionMaterials)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(and(
                eq(demolitionMaterials.id, id),
                eq(demolitionMaterials.tenantId, tenantId)
            ))
            .returning();

        return updated || null;
    }

    // 철거자재 이력 생성
    async createDemolitionMaterialLog(data: InsertDemolitionMaterialLog, tenantId: string) {
        const [log] = await db
            .insert(demolitionMaterialLogs)
            .values({
                ...data,
                tenantId,
            })
            .returning();

        return log;
    }

    // 철거자재 이력 조회 (특정 자재)
    async getDemolitionMaterialLogs(materialId: string, tenantId: string) {
        return await db
            .select()
            .from(demolitionMaterialLogs)
            .where(and(
                eq(demolitionMaterialLogs.materialId, materialId),
                eq(demolitionMaterialLogs.tenantId, tenantId)
            ))
            .orderBy(desc(demolitionMaterialLogs.createdAt));
    }

    // 전체 이력 조회
    async getAllDemolitionMaterialLogs(tenantId: string, filters?: { type?: string; teamId?: string }) {
        const conditions = [eq(demolitionMaterialLogs.tenantId, tenantId)];

        if (filters?.type) {
            conditions.push(eq(demolitionMaterialLogs.logType, filters.type));
        }

        if (filters?.teamId) {
            conditions.push(eq(demolitionMaterialLogs.teamId, filters.teamId));
        }

        return await db.query.demolitionMaterialLogs.findMany({
            where: and(...conditions),
            orderBy: desc(demolitionMaterialLogs.createdAt),
            with: {
                material: true,
                team: true,
                creator: true
            }
        });
    }

    // 대시보드 데이터
    async getDemolitionDashboard(tenantId: string) {
        const materials = await this.getDemolitionMaterials(tenantId);

        const stats = {
            total: materials.length,
            pendingReview: materials.filter(m => m.status === 'pending_review').length,
            approvedReusable: materials.filter(m => m.status === 'approved_reusable').length,
            inUse: materials.filter(m => m.status === 'in_use').length,
            disposed: materials.filter(m => m.status === 'disposed').length,
            rejected: materials.filter(m => m.status === 'rejected').length,
            totalOriginalQuantity: materials.reduce((sum, m) => sum + m.originalQuantity, 0),
            totalUsedQuantity: materials.reduce((sum, m) => sum + m.usedQuantity, 0),
            totalRemainingQuantity: materials.reduce((sum, m) => sum + m.remainingQuantity, 0),
            totalWasteQuantity: materials.reduce((sum, m) => sum + m.wasteQuantity, 0),
        };

        const recentLogs = await db
            .select()
            .from(demolitionMaterialLogs)
            .where(eq(demolitionMaterialLogs.tenantId, tenantId))
            .orderBy(desc(demolitionMaterialLogs.createdAt))
            .limit(10);

        return {
            stats,
            recentLogs,
            materials: materials.slice(0, 20) // 최근 20개만
        };
    }
}
