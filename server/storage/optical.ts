import {
    type OpticalCable, type InsertOpticalCable,
    type OpticalCableLog, type InsertOpticalCableLog,
    opticalCables, opticalCableLogs, teams
} from "../../shared/schema.js";
import { db } from "../db.js";
import { eq, and, desc, inArray } from "drizzle-orm";

export class OpticalStorage {
    async getOpticalCables(tenantId: string): Promise<OpticalCable[]> {
        return await db.query.opticalCables.findMany({
            where: eq(opticalCables.tenantId, tenantId),
            orderBy: [desc(opticalCables.createdAt)]
        });
    }

    async getOpticalCable(id: string, tenantId: string): Promise<OpticalCable | undefined> {
        return await db.query.opticalCables.findFirst({
            where: and(eq(opticalCables.id, id), eq(opticalCables.tenantId, tenantId))
        });
    }

    async createOpticalCable(cable: InsertOpticalCable, tenantId: string): Promise<OpticalCable> {
        const [newCable] = await db.insert(opticalCables).values({
            ...cable,
            tenantId
        }).returning();
        return newCable;
    }

    async updateOpticalCable(id: string, updates: Partial<InsertOpticalCable>, tenantId: string): Promise<OpticalCable | undefined> {
        const [updated] = await db.update(opticalCables)
            .set(updates)
            .where(and(eq(opticalCables.id, id), eq(opticalCables.tenantId, tenantId)))
            .returning();
        return updated;
    }

    async createOpticalCablesBulk(cables: InsertOpticalCable[], tenantId: string): Promise<OpticalCable[]> {
        if (cables.length === 0) return [];

        // Enrich with tenantId if missing (though insert type usually expects it or we manually map)
        const cablesWithTenant = cables.map(c => ({
            ...c,
            tenantId
        }));

        return await db.insert(opticalCables).values(cablesWithTenant).returning();
    }

    async bulkDeleteOpticalCables(ids: string[], tenantId: string): Promise<void> {
        if (ids.length === 0) return;
        await db.delete(opticalCables)
            .where(and(
                inArray(opticalCables.id, ids),
                eq(opticalCables.tenantId, tenantId)
            ));
    }

    // Logs
    async getOpticalCableLogs(cableId: string, tenantId: string): Promise<OpticalCableLog[]> {
        return await db.query.opticalCableLogs.findMany({
            where: and(
                eq(opticalCableLogs.cableId, cableId),
                eq(opticalCableLogs.tenantId, tenantId)
            ),
            orderBy: [desc(opticalCableLogs.usageDate), desc(opticalCableLogs.id)]
        });
    }

    // For unified log view
    async getAllOpticalCableLogs(tenantId: string): Promise<(OpticalCableLog & { cable: OpticalCable | null, createdByName?: string | null })[]> {
        const logs = await db.query.opticalCableLogs.findMany({
            where: eq(opticalCableLogs.tenantId, tenantId),
            orderBy: [desc(opticalCableLogs.usageDate), desc(opticalCableLogs.id)],
            with: {
                cable: true
            }
        });

        // Fetch user names for createdBy
        const userIds = logs.map(log => log.createdBy).filter(Boolean) as string[];
        const uniqueUserIds = Array.from(new Set(userIds));

        if (uniqueUserIds.length === 0) {
            return logs.map(log => ({ ...log, createdByName: null }));
        }

        const { users } = await import('../../shared/schema.js');
        const { inArray } = await import('drizzle-orm');

        const usersData = await db.select({
            id: users.id,
            name: users.name
        }).from(users).where(inArray(users.id, uniqueUserIds));

        const userMap = new Map(usersData.map(u => [u.id, u.name]));

        return logs.map(log => ({
            ...log,
            createdByName: log.createdBy ? userMap.get(log.createdBy) || null : null
        }));
    }

    async getOpticalCableLog(id: string, tenantId: string): Promise<OpticalCableLog | undefined> {
        return await db.query.opticalCableLogs.findFirst({
            where: and(eq(opticalCableLogs.id, id), eq(opticalCableLogs.tenantId, tenantId))
        });
    }

    async updateOpticalCableLog(id: string, updates: Partial<InsertOpticalCableLog>, tenantId: string): Promise<OpticalCableLog | undefined> {
        const [updated] = await db.update(opticalCableLogs)
            .set(updates)
            .where(and(eq(opticalCableLogs.id, id), eq(opticalCableLogs.tenantId, tenantId)))
            .returning();
        return updated;
    }

    async bulkDeleteOpticalCableLogs(ids: string[], tenantId: string): Promise<void> {
        if (ids.length === 0) return;
        await db.delete(opticalCableLogs)
            .where(and(
                inArray(opticalCableLogs.id, ids),
                eq(opticalCableLogs.tenantId, tenantId)
            ));
    }

    async createOpticalCableLog(log: InsertOpticalCableLog, tenantId: string): Promise<OpticalCable> {
        return await db.transaction(async (tx) => {
            // 1. Get current cable state
            const [cable] = await tx.select().from(opticalCables).where(eq(opticalCables.id, log.cableId));
            if (!cable) throw new Error("Cable not found");

            // 2. Determine updates based on log type
            // Use any to avoid Partial<Insert> excluding updatedAt
            let updates: any = { updatedAt: new Date() };
            let finalUsed = cable.usedLength || 0;
            // totalLength is text in schema, parse it.
            let totalLen = parseFloat(cable.totalLength) || 0;
            let finalRemaining = cable.remainingLength || 0;
            if (log.logType === 'assign') {
                // 불출: 팀 할당, 상태 변경
                if (!log.teamId) throw new Error("Team ID is required for assignment");
                updates.currentTeamId = log.teamId;
                updates.status = 'assigned';
            } else if (log.logType === 'return') {
                // 반납: 팀 해제, 상태 변경 (창고)
                updates.currentTeamId = null;
                updates.status = 'in_stock';
            } else if (log.logType === 'usage') {
                // 사용: 길이 차감
                // 설치 길이와 폐기 길이를 합쳐서 총 사용량 계산
                const usageAmount = (log.installLength || 0) + (log.wasteLength || 0);
                finalUsed += usageAmount;
                finalRemaining = totalLen - finalUsed;

                updates.usedLength = finalUsed;
                updates.remainingLength = finalRemaining;

                // 잔량이 0 이하면 사용 완료 처리
                if (finalRemaining <= 0) {
                    updates.status = 'used_up';
                }
            } else if (log.logType === 'waste') {
                // 폐기: 상태 변경
                updates.status = 'waste';
            }

            // 3. Update Cable
            const [updatedCable] = await tx.update(opticalCables)
                .set(updates)
                .where(eq(opticalCables.id, log.cableId))
                .returning();

            // 4. Create Log
            await tx.insert(opticalCableLogs).values({
                ...log,
                tenantId,
                // 사용(usage)인 경우에만 계산된 값 사용, 나머지는 0
                usedLength: log.logType === 'usage' ? ((log.installLength || 0) + (log.wasteLength || 0)) : 0,
                beforeRemaining: cable.remainingLength,
                afterRemaining: finalRemaining
            });

            return updatedCable;
        });
    }

    async deleteOpticalCableLog(id: string, tenantId: string): Promise<boolean> {
        return await db.transaction(async (tx) => {
            // 1. Get log to be deleted
            const [log] = await tx.select().from(opticalCableLogs).where(and(eq(opticalCableLogs.id, id), eq(opticalCableLogs.tenantId, tenantId)));
            if (!log) return false;

            // 2. Get associated cable
            const [cable] = await tx.select().from(opticalCables).where(eq(opticalCables.id, log.cableId));
            if (!cable) throw new Error("Cable not found");

            // 3. Rollback logic based on log type
            let updates: any = { updatedAt: new Date() };
            if (log.logType === 'assign') {
                // 출고 취소 -> 반납됨(창고로 복귀) 상태로 변경이 아니라, 아예 출고가 없던 상태로 복구
                updates.status = 'in_stock';
                updates.currentTeamId = null;
            } else if (log.logType === 'usage') {
                // 사용 취소 -> 사용량 차감 복구, 잔량 복구
                const restoredRemaining = (cable.remainingLength || 0) + (log.usedLength || 0);
                const restoredUsed = (cable.usedLength || 0) - (log.usedLength || 0);

                updates.usedLength = restoredUsed;
                updates.remainingLength = restoredRemaining;
                // 잔량이 생기면 다시 assigned 상태로 (팀 보유 중이었을 테니)
                updates.status = restoredRemaining > 0 ? 'assigned' : 'used_up';
            } else if (log.logType === 'return') {
                // 반납 취소 -> 다시 assigned 상태로, 팀도 복구해야 함.
                if (log.teamId) {
                    updates.status = 'assigned';
                    updates.currentTeamId = log.teamId;
                }
            } else if (log.logType === 'waste') {
                // 폐기 취소 -> 일단 in_stock으로 복구 (창고 폐기 가정)
                updates.status = 'in_stock';
                updates.currentTeamId = null;
            }

            // Update Cable
            await tx.update(opticalCables)
                .set(updates)
                .where(eq(opticalCables.id, cable.id));

            // 4. Delete log
            const result = await tx.delete(opticalCableLogs).where(eq(opticalCableLogs.id, id)).returning();
            return result.length > 0;
        });
    }
    async updateCableReservation(
        id: string,
        action: 'reserve' | 'release',
        projectName: string | undefined,
        userId: string,
        tenantId: string
    ): Promise<OpticalCable> {
        return await db.transaction(async (tx) => {
            const [cable] = await tx.select().from(opticalCables).where(
                and(eq(opticalCables.id, id), eq(opticalCables.tenantId, tenantId))
            );

            if (!cable) throw new Error("Cable not found");

            // 상태 업데이트 객체
            // Using 'any' to avoid strict type checking on nullable fields during update if needed, 
            // but Partial<InsertOpticalCable> is safer if types align perfectly with nulls
            const updates: any = { updatedAt: new Date() };

            if (action === 'reserve') {
                // 이미 예약되었거나, 불출된 자재는 예약 불가
                // 단, 예약 해제는 가능해야 함
                if (cable.status !== 'in_stock') throw new Error("Cannot reserve cable that is not in stock");
                if (cable.reservationStatus === 'reserved') throw new Error("Cable is already reserved");

                updates.reservationStatus = 'reserved';
                updates.reservedForProject = projectName;
                updates.reservedBy = userId;
                updates.reservedAt = new Date();
            } else {
                if (cable.reservationStatus !== 'reserved') throw new Error("Cable is not reserved");

                updates.reservationStatus = 'none';
                updates.reservedForProject = null;
                updates.reservedBy = null;
                updates.reservedAt = null;
            }

            const [updatedCable] = await tx.update(opticalCables)
                .set(updates)
                .where(eq(opticalCables.id, id))
                .returning();

            return updatedCable;
        });
    }
}
