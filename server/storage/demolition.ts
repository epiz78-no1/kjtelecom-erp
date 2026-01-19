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
    async getDemolitionMaterialLog(id: string, tenantId: string) {
        const results = await db
            .select()
            .from(demolitionMaterialLogs)
            .where(and(
                eq(demolitionMaterialLogs.id, id),
                eq(demolitionMaterialLogs.tenantId, tenantId)
            ))
            .limit(1);

        return results[0] || null;
    }

    async updateDemolitionMaterialLog(id: string, updates: Partial<InsertDemolitionMaterialLog>, tenantId: string) {
        // 1. 기존 로그 조회
        const oldLog = await this.getDemolitionMaterialLog(id, tenantId);
        if (!oldLog) return null;

        // 2. 자재 조회
        const material = await this.getDemolitionMaterial(oldLog.materialId, tenantId);
        if (!material) throw new Error("Material not found");

        let remainingQuantity = material.remainingQuantity;
        let usedQuantity = material.usedQuantity;

        // 3. 수량 변경이 있는 경우 자재 잔량/사용량 조정
        if (updates.usedQuantity !== undefined && updates.usedQuantity !== oldLog.usedQuantity) {
            const diff = updates.usedQuantity - oldLog.usedQuantity;

            if (remainingQuantity < diff) {
                throw new Error(`잔량이 부족합니다 (필요: ${diff}, 보유: ${remainingQuantity})`);
            }

            remainingQuantity -= diff;
            usedQuantity += diff;
        }

        // 4. 자재 상태 업데이트 (수량이 변경된 경우만)
        if (updates.usedQuantity !== undefined && updates.usedQuantity !== oldLog.usedQuantity) {
            let newStatus = material.status;
            if (remainingQuantity === 0) {
                newStatus = 'disposed'; // 잔량이 0이면 소진/폐기 처리
            } else if (usedQuantity > 0) {
                newStatus = 'in_use'; // 사용 중
            } else {
                newStatus = 'approved_reusable'; // 다시 미사용 상태 (승인됨)
            }

            await this.updateDemolitionMaterial(material.id, {
                remainingQuantity,
                usedQuantity,
                status: newStatus
            }, tenantId);
        }

        // 5. 로그 업데이트
        const [updatedLog] = await db
            .update(demolitionMaterialLogs)
            .set({
                ...updates,
                // 수량 변경 시 before/after 조정
                beforeQuantity: updates.usedQuantity !== undefined ? material.remainingQuantity : oldLog.beforeQuantity,
                afterQuantity: updates.usedQuantity !== undefined ? remainingQuantity : oldLog.afterQuantity
            })
            .where(and(
                eq(demolitionMaterialLogs.id, id),
                eq(demolitionMaterialLogs.tenantId, tenantId)
            ))
            .returning();

        return updatedLog;
    }

    async deleteDemolitionMaterialLog(id: string, tenantId: string) {
        // 1. 기존 로그 조회
        const log = await this.getDemolitionMaterialLog(id, tenantId);
        if (!log) return false;

        // 2. 자재 조회 및 수량 복구 (outgoing, usage, dispose 타입인 경우)
        if (log.logType === 'outgoing' || log.logType === 'usage' || log.logType === 'dispose') {
            const material = await this.getDemolitionMaterial(log.materialId, tenantId);
            if (material) {
                const quantityToRestore = log.usedQuantity || 0;
                const newRemaining = material.remainingQuantity + quantityToRestore;
                const newUsed = Math.max(0, material.usedQuantity - quantityToRestore);

                let newStatus = material.status;
                if (newRemaining === 0) {
                    newStatus = 'disposed';
                } else if (newUsed > 0) {
                    newStatus = 'in_use';
                } else {
                    newStatus = 'approved_reusable';
                }

                await this.updateDemolitionMaterial(material.id, {
                    remainingQuantity: newRemaining,
                    usedQuantity: newUsed,
                    status: newStatus
                }, tenantId);
            }
        }

        // 3. 로그 삭제
        const result = await db
            .delete(demolitionMaterialLogs)
            .where(and(
                eq(demolitionMaterialLogs.id, id),
                eq(demolitionMaterialLogs.tenantId, tenantId)
            ));

        return result.rowCount ? result.rowCount > 0 : false;
    }

    async bulkDeleteDemolitionMaterialLogs(ids: string[], tenantId: string) {
        let deletedCount = 0;
        for (const id of ids) {
            const success = await this.deleteDemolitionMaterialLog(id, tenantId);
            if (success) deletedCount++;
        }
        return deletedCount;
    }
}

