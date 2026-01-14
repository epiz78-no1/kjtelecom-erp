import {
    type OpticalCable, type InsertOpticalCable,
    type OpticalCableLog, type InsertOpticalCableLog,
    type Team,
    opticalCables, opticalCableLogs, teams
} from "../../shared/schema.js";
import { db } from "../db.js";
import { eq, ne, and, desc, asc, inArray, getTableColumns, sql } from "drizzle-orm";

export class OpticalStorage {
    async getOpticalCables(tenantId: string): Promise<(OpticalCable & { currentTeam: Team | null })[]> {
        return await db.query.opticalCables.findMany({
            where: eq(opticalCables.tenantId, tenantId),
            orderBy: [desc(opticalCables.receivedDate), desc(opticalCables.createdAt)],
            with: {
                currentTeam: true
            }
        }) as (OpticalCable & { currentTeam: Team | null })[];
    }

    async getOpticalCable(id: string, tenantId: string): Promise<OpticalCable | undefined> {
        return await db.query.opticalCables.findFirst({
            where: and(eq(opticalCables.id, id), eq(opticalCables.tenantId, tenantId))
        });
    }

    async createOpticalCable(cable: InsertOpticalCable, tenantId: string): Promise<OpticalCable> {
        return await db.transaction(async (tx) => {
            // 중복 체크: 사업(division) + 제조년도(manufactureYear) + 제조번호(drumNo) 조합이 이미 존재하는지 확인
            const existing = await tx.select()
                .from(opticalCables)
                .where(and(
                    eq(opticalCables.tenantId, tenantId),
                    ne(opticalCables.status, 'waste'),
                    eq(opticalCables.division, cable.division || ''),
                    eq(opticalCables.category, cable.category || ''),
                    eq(opticalCables.productName, cable.productName.toString()),
                    eq(opticalCables.drumNo, cable.drumNo)
                ))
                .limit(1);

            if (existing.length > 0) {
                throw new Error(`이미 등록된 케이블입니다. [${cable.division}] ${cable.manufactureYear || '연도미상'} - ${cable.drumNo}`);
            }

            const [newCable] = await tx.insert(opticalCables).values({
                ...cable,
                tenantId
            }).returning();

            // Create incoming log entry
            await tx.insert(opticalCableLogs).values({
                cableId: newCable.id,
                logType: 'create', // Change to 'create' to match OpticalIncoming.tsx filter
                usageDate: newCable.receivedDate || new Date().toISOString().split('T')[0],
                afterRemaining: newCable.remainingLength,
                attributes: newCable.attributes, // Copy attributes (attachments) to log
                tenantId,
                createdBy: cable.createdBy // ensure createdBy follows the cable creator
            });

            return newCable;
        });
    }

    async updateOpticalCable(id: string, updates: Partial<InsertOpticalCable>, tenantId: string): Promise<OpticalCable | undefined> {


        return await db.transaction(async (tx) => {
            const [updated] = await tx.update(opticalCables)
                .set(updates)
                .where(and(eq(opticalCables.id, id), eq(opticalCables.tenantId, tenantId)))
                .returning();

            // Sync relevant fields to 'create', 'incoming', or 'receive' logs
            const logUpdates: any = {};
            let hasLogUpdates = false;

            if (updates.attributes !== undefined) {
                logUpdates.attributes = updates.attributes;
                hasLogUpdates = true;
            }
            if (updates.projectCode !== undefined) {
                logUpdates.projectCode = updates.projectCode;
                hasLogUpdates = true;
            }
            if (updates.projectName !== undefined) {
                logUpdates.projectNameUsage = updates.projectName;
                hasLogUpdates = true;
            }

            if (updated && hasLogUpdates) {
                await tx.update(opticalCableLogs)
                    .set(logUpdates)
                    .where(and(
                        eq(opticalCableLogs.cableId, id),
                        eq(opticalCableLogs.tenantId, tenantId),
                        sql`${opticalCableLogs.logType} IN ('create', 'incoming', 'receive')`
                    ));
            }

            return updated;
        });
    }

    async createOpticalCablesBulk(cables: InsertOpticalCable[], tenantId: string): Promise<OpticalCable[]> {
        if (cables.length === 0) return [];

        return await db.transaction(async (tx) => {
            // Enrich with tenantId
            const cablesWithTenant = cables.map(c => ({
                ...c,
                tenantId
            }));

            // Enforce uniqueness check manually since DB constraint is missing
            const inputDrumNos = cables.map(c => c.drumNo);
            if (inputDrumNos.length > 0) {
                const candidates = await tx.select().from(opticalCables)
                    .where(and(
                        eq(opticalCables.tenantId, tenantId),
                        ne(opticalCables.status, 'waste'),
                        inArray(opticalCables.drumNo, inputDrumNos)
                    ));

                // Check for collisions (division + category + productName + drumNo)
                const existingSet = new Set(candidates.map(c => `${c.division || ''}-${c.category || ''}-${c.productName}-${c.drumNo}`));

                const duplicates = cables.filter(c => existingSet.has(`${c.division || ''}-${c.category || ''}-${c.productName}-${c.drumNo}`));

                if (duplicates.length > 0) {
                    const dupMsg = duplicates.map(d => `${d.drumNo}[${d.division || '-'}/${d.category || '-'}/${d.productName}]`).slice(0, 5).join(', ');
                    throw new Error(`중복된 케이블이 존재합니다: ${dupMsg}${duplicates.length > 5 ? ' 외 ' + (duplicates.length - 5) + '건' : ''}`);
                }
            }

            const insertedCables = await tx.insert(opticalCables).values(cablesWithTenant).returning();

            // Create 'create' logs for each inserted cable
            if (insertedCables.length > 0) {
                const logs = insertedCables.map(newCable => ({
                    cableId: newCable.id,
                    logType: 'create',
                    usageDate: newCable.receivedDate || new Date().toISOString().split('T')[0],
                    afterRemaining: newCable.remainingLength,
                    attributes: newCable.attributes,
                    tenantId,
                    createdBy: newCable.createdBy
                }));

                await tx.insert(opticalCableLogs).values(logs);
            }

            return insertedCables;
        });
    }

    async bulkDeleteOpticalCables(ids: string[], tenantId: string): Promise<void> {
        if (ids.length === 0) return;
        await db.update(opticalCables)
            .set({
                status: 'waste',
                currentTeamId: null,
                updatedAt: new Date()
            })
            .where(and(
                inArray(opticalCables.id, ids),
                eq(opticalCables.tenantId, tenantId)
            ));
    }

    async getOpticalCableLogs(cableId: string, tenantId: string): Promise<OpticalCableLog[]> {
        const { users } = await import('../../shared/schema.js'); // Dynamic import to avoid circular dependency if any, though schema is usually safe. 
        // Actually schema imports are at top level in original file.
        // We need leftJoin here.

        const logs = await db.select({
            ...getTableColumns(opticalCableLogs),
            createdByName: users.name,
            attributes: sql<string>`
                CASE 
                    WHEN length(${opticalCableLogs.attributes}) < 1000 THEN ${opticalCableLogs.attributes}
                    ELSE 
                        (
                            SELECT jsonb_set(
                                jsonb_set(
                                    ${opticalCableLogs.attributes}::jsonb,
                                    '{attachments}',
                                    COALESCE(
                                        (
                                            SELECT jsonb_agg(elem - 'data')
                                            FROM jsonb_array_elements(
                                                CASE 
                                                    WHEN ${opticalCableLogs.attributes}::jsonb ? 'attachments' 
                                                    THEN ${opticalCableLogs.attributes}::jsonb -> 'attachments'
                                                    ELSE '[]'::jsonb 
                                                END
                                            ) elem
                                        ),
                                        '[]'::jsonb
                                    )
                                ),
                                '{wastePhotos}',
                                COALESCE(
                                    (
                                        SELECT jsonb_agg(elem - 'data')
                                        FROM jsonb_array_elements(
                                            CASE 
                                                WHEN ${opticalCableLogs.attributes}::jsonb ? 'wastePhotos' 
                                                THEN ${opticalCableLogs.attributes}::jsonb -> 'wastePhotos'
                                                ELSE '[]'::jsonb 
                                            END
                                        ) elem
                                    ),
                                    '[]'::jsonb
                                )
                            ) - 'data' #- '{attachment,data}'
                        )::text
                END`
        })
            .from(opticalCableLogs)
            .leftJoin(users, eq(opticalCableLogs.createdBy, users.id))
            .where(and(
                eq(opticalCableLogs.cableId, cableId),
                eq(opticalCableLogs.tenantId, tenantId)
            ))
            .orderBy(desc(opticalCableLogs.usageDate), desc(opticalCableLogs.createdAt));

        return logs as OpticalCableLog[];
    }

    // For unified log view
    async getAllOpticalCableLogs(tenantId: string, filters?: { type?: string, teamId?: string }): Promise<(OpticalCableLog & { cable: OpticalCable | null })[]> {
        const conditions = [eq(opticalCableLogs.tenantId, tenantId)];

        if (filters?.type) {
            conditions.push(eq(opticalCableLogs.logType, filters.type));
        }

        if (filters?.teamId) {
            conditions.push(eq(opticalCableLogs.teamId, filters.teamId));
        }

        const { users } = await import('../../shared/schema.js');

        // Note: db.select with joins returns a flat object by default unless we structure it. 
        // But the original return type expects nested 'cable' object. 
        // Drizzle's db.select doesn't easily support nested object mapping without some manual work or using aggregate functions.
        // However, we MUST use db.select for the SQL projection of attributes.
        // Alternatively, we can join and map manually. 

        const rows = await db.select({
            log: getTableColumns(opticalCableLogs),
            cable: getTableColumns(opticalCables),
            createdByName: users.name,
            attributes: sql<string>`
                CASE 
                    WHEN length(${opticalCableLogs.attributes}) < 1000 THEN ${opticalCableLogs.attributes}
                    ELSE 
                        (
                            SELECT jsonb_set(
                                jsonb_set(
                                    ${opticalCableLogs.attributes}::jsonb,
                                    '{attachments}',
                                    COALESCE(
                                        (
                                            SELECT jsonb_agg(elem - 'data')
                                            FROM jsonb_array_elements(
                                                CASE 
                                                    WHEN ${opticalCableLogs.attributes}::jsonb ? 'attachments' 
                                                    THEN ${opticalCableLogs.attributes}::jsonb -> 'attachments'
                                                    ELSE '[]'::jsonb 
                                                END
                                            ) elem
                                        ),
                                        '[]'::jsonb
                                    )
                                ),
                                '{wastePhotos}',
                                COALESCE(
                                    (
                                        SELECT jsonb_agg(elem - 'data')
                                        FROM jsonb_array_elements(
                                            CASE 
                                                WHEN ${opticalCableLogs.attributes}::jsonb ? 'wastePhotos' 
                                                THEN ${opticalCableLogs.attributes}::jsonb -> 'wastePhotos'
                                                ELSE '[]'::jsonb 
                                            END
                                        ) elem
                                    ),
                                    '[]'::jsonb
                                )
                            ) - 'data' #- '{attachment,data}'
                        )::text
                END`
        })
            .from(opticalCableLogs)
            .leftJoin(opticalCables, eq(opticalCableLogs.cableId, opticalCables.id))
            .leftJoin(users, eq(opticalCableLogs.createdBy, users.id))
            .where(and(...conditions))
            .orderBy(desc(opticalCableLogs.usageDate), desc(opticalCableLogs.createdAt));

        return rows.map(row => ({
            ...row.log,
            attributes: row.attributes,
            createdByName: row.createdByName,
            cable: row.cable // This will be null if left join failed, but opticalCables should exist. If id is null, cable is null.
        })) as (OpticalCableLog & { cable: OpticalCable | null })[];
    }




    async getOpticalCableLog(id: string, tenantId: string): Promise<OpticalCableLog | undefined> {
        return await db.query.opticalCableLogs.findFirst({
            where: and(eq(opticalCableLogs.id, id), eq(opticalCableLogs.tenantId, tenantId))
        });
    }

    async updateOpticalCableLog(id: string, updates: Partial<InsertOpticalCableLog>, tenantId: string): Promise<OpticalCableLog | undefined> {
        return await db.transaction(async (tx) => {
            // 1. Get old log to calculate delta
            const [oldLog] = await tx.select().from(opticalCableLogs).where(and(eq(opticalCableLogs.id, id), eq(opticalCableLogs.tenantId, tenantId)));
            if (!oldLog) return undefined;

            // 2. Update log
            const [updatedLog] = await tx.update(opticalCableLogs)
                .set({ ...updates })
                .where(eq(opticalCableLogs.id, id))
                .returning();

            // 3. If usage/waste changed, update cable
            // Only relevant for 'usage' type logs for now
            if (oldLog.logType === 'usage') {
                const oldUsage = (oldLog.installLength || 0) + (oldLog.wasteLength || 0);
                const newUsage = (updatedLog.installLength || 0) + (updatedLog.wasteLength || 0);

                if (oldUsage !== newUsage) {
                    const diff = newUsage - oldUsage; // Positive means MORE used

                    const [cable] = await tx.select().from(opticalCables).where(eq(opticalCables.id, oldLog.cableId));
                    if (cable) {
                        let finalRemaining = (cable.remainingLength || 0) - diff;
                        let finalUsed = (cable.usedLength || 0) + diff;
                        let newStatus = cable.status;

                        if (finalRemaining <= 0) {
                            newStatus = 'used_up';
                        } else if (cable.status === 'used_up' && finalRemaining > 0) {
                            // Recovered from used_up
                            newStatus = cable.currentTeamId ? 'assigned' : 'in_stock';
                        }

                        await tx.update(opticalCables).set({
                            remainingLength: finalRemaining,
                            usedLength: finalUsed,
                            status: newStatus,
                            updatedAt: new Date()
                        }).where(eq(opticalCables.id, cable.id));
                    }
                }
            }

            return updatedLog;
        });
    }

    async bulkDeleteOpticalCableLogs(ids: string[], tenantId: string): Promise<void> {
        if (ids.length === 0) return;
        // Iterate to ensure state rollback logic in deleteOpticalCableLog is applied
        for (const id of ids) {
            await this.deleteOpticalCableLog(id, tenantId);
        }
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
            let finalRemaining = cable.remainingLength;
            // If remainingLength is undefined, we assume 0.
            if (finalRemaining === undefined || finalRemaining === null) finalRemaining = 0;

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
                // 사용: 잔량 차감 (Incremental)
                const usageAmount = (log.installLength || 0) + (log.wasteLength || 0);

                finalUsed += usageAmount;
                finalRemaining = finalRemaining - usageAmount;

                updates.usedLength = finalUsed;
                updates.remainingLength = finalRemaining;

                // 잔량이 0 이하면 자동 폐기 처리
                if (finalRemaining <= 0) {
                    updates.status = 'waste';
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
            let updates: any = {
                updatedAt: new Date(),
                returnRequestStatus: 'none' // Reset return request status when deleting a log
            };
            if (['create', 'incoming', 'receive'].includes(log.logType)) {
                // 입고 내역 삭제 시: 관련된 다른 이력(불출, 사용 등)이 없는 경우에만 자재와 함께 삭제
                const otherLogs = await tx.select({ id: opticalCableLogs.id }).from(opticalCableLogs)
                    .where(and(
                        eq(opticalCableLogs.cableId, cable.id),
                        ne(opticalCableLogs.id, id)
                    ))
                    .limit(1);

                if (otherLogs.length > 0) {
                    throw new Error("이미 사용 또는 불출 이력이 존재하는 자재의 입고 내역은 삭제할 수 없습니다.");
                }

                // 다른 이력이 없으면 자재 자체를 삭제 (Cascade로 인해 이 로그도 함께 삭제됨)
                await tx.delete(opticalCables).where(eq(opticalCables.id, cable.id));
                return true;
            }

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
                // currentTeamId는 유지 (이미 불출된 상태였으므로)
                updates.status = restoredRemaining > 0 ? 'assigned' : 'used_up';
                // teamId 복구: 로그에 기록된 팀으로 복구
                // teamId 복구: 로그에 기록된 팀으로 복구하되,
                // 현재 다른 팀이 사용 중이라면('assigned' 상태이고 currentTeamId가 다름) 덮어쓰지 않음.
                // 즉, 'used_up' 상태였거나, 주인이 없는 상태('in_stock' 등??), 또는 주인이 같은 경우에만 복구.
                if (log.teamId && restoredRemaining > 0) {
                    if (cable.status === 'used_up' || !cable.currentTeamId || cable.currentTeamId === log.teamId) {
                        updates.currentTeamId = log.teamId;
                    }
                }
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

            // Create log entry only for reservation (not for release)
            if (action === 'reserve') {
                await tx.insert(opticalCableLogs).values({
                    cableId: id,
                    logType: 'reserve',
                    projectNameUsage: projectName,
                    usageDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
                    usedLength: 0,
                    afterRemaining: cable.remainingLength,
                    tenantId,
                    createdBy: userId
                });
            } else {
                // Delete existing reservation log when releasing
                await tx.delete(opticalCableLogs).where(
                    and(
                        eq(opticalCableLogs.cableId, id),
                        eq(opticalCableLogs.logType, 'reserve'),
                        eq(opticalCableLogs.tenantId, tenantId)
                    )
                );
            }

            return updatedCable;
        });
    }

    async bulkAssignOpticalCables(items: any[], tenantId: string, userId: string): Promise<any[]> {
        if (items.length === 0) return [];

        return await db.transaction(async (tx) => {
            const results = [];

            for (const item of items) {
                // Find cable by drumNo
                const [cable] = await tx.select()
                    .from(opticalCables)
                    .where(and(
                        eq(opticalCables.tenantId, tenantId),
                        eq(opticalCables.drumNo, item.drumNo)
                    ))
                    .limit(1);

                if (!cable) {
                    throw new Error(`케이블을 찾을 수 없습니다: ${item.drumNo}`);
                }

                if (cable.status !== 'in_stock') {
                    throw new Error(`케이블이 출고 가능한 상태가 아닙니다: ${item.drumNo} (현재 상태: ${cable.status})`);
                }

                // Find team by name
                const [team] = await tx.select()
                    .from(teams)
                    .where(and(
                        eq(teams.tenantId, tenantId),
                        eq(teams.name, item.teamName)
                    ))
                    .limit(1);

                if (!team) {
                    throw new Error(`팀을 찾을 수 없습니다: ${item.teamName}`);
                }

                // Update cable status
                const [updatedCable] = await tx.update(opticalCables)
                    .set({
                        currentTeamId: team.id,
                        status: 'assigned',
                        updatedAt: new Date()
                    })
                    .where(eq(opticalCables.id, cable.id))
                    .returning();

                // Create assignment log
                await tx.insert(opticalCableLogs).values({
                    cableId: cable.id,
                    logType: 'assign',
                    teamId: team.id,
                    usageDate: item.date,
                    projectCode: item.projectCode,
                    projectNameUsage: item.projectName,
                    workerName: item.recipient,
                    beforeRemaining: cable.remainingLength,
                    afterRemaining: cable.remainingLength,
                    usedLength: 0,
                    attributes: JSON.stringify({
                        recipient: item.recipient,
                        remark: item.remark || undefined
                    }),
                    tenantId,
                    createdBy: userId
                });

                results.push(updatedCable);
            }

            return results;
        });
    }
}

