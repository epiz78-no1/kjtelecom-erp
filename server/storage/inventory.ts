import {
    type InventoryItem, type InsertInventoryItem,
    type OutgoingRecord, type InsertOutgoingRecord,
    type MaterialUsageRecord, type InsertMaterialUsageRecord,
    type IncomingRecord, type InsertIncomingRecord,
    inventoryItems, outgoingRecords, materialUsageRecords, incomingRecords
} from "../../shared/schema.js";
import { db } from "../db.js";
import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";

export class InventoryStorage {
    // Inventory
    async getInventoryItems(tenantId: string): Promise<InventoryItem[]> {
        return await db.select().from(inventoryItems).where(eq(inventoryItems.tenantId, tenantId)).orderBy(asc(inventoryItems.id));
    }

    async getInventoryItem(id: number, tenantId: string): Promise<InventoryItem | undefined> {
        const [item] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId)));
        return item;
    }

    async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
        const [newItem] = await db.insert(inventoryItems).values(item).returning();
        return newItem;
    }

    async updateInventoryItem(id: number, updates: Partial<InsertInventoryItem>, tenantId: string): Promise<InventoryItem | undefined> {
        const [updated] = await db.update(inventoryItems)
            .set(updates)
            .where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId)))
            .returning();
        return updated;
    }

    async deleteInventoryItem(id: number, tenantId: string): Promise<boolean> {
        const [deleted] = await db.delete(inventoryItems)
            .where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId)))
            .returning();
        return !!deleted;
    }

    async bulkDeleteInventoryItems(ids: number[], tenantId: string): Promise<number> {
        if (ids.length === 0) return 0;
        const result = await db.delete(inventoryItems)
            .where(and(
                inArray(inventoryItems.id, ids),
                eq(inventoryItems.tenantId, tenantId)
            ))
            .returning();
        return result.length;
    }

    async clearInventoryItems(tenantId: string): Promise<void> {
        await db.delete(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));
    }

    async bulkCreateInventoryItems(items: InsertInventoryItem[]): Promise<InventoryItem[]> {
        if (items.length === 0) return [];
        return await db.insert(inventoryItems).values(items).returning();
    }

    async syncInventoryItems(items: InsertInventoryItem[], tenantId: string, mode: 'overwrite' | 'add' = 'overwrite'): Promise<InventoryItem[]> {
        // 1. Process items in a transaction
        return await db.transaction(async (tx) => {
            const results: InventoryItem[] = [];

            for (const item of items) {
                // Find existing item by key: division + productName + specification
                const [existing] = await tx.select().from(inventoryItems).where(and(
                    eq(inventoryItems.tenantId, tenantId),
                    eq(inventoryItems.division, item.division || "SKT"),
                    eq(inventoryItems.productName, item.productName),
                    eq(inventoryItems.specification, item.specification || "")
                ));

                // Use item's totalAmount if provided, or calculate it. 
                // Note: Logic has evolved. If unitPrice is provided, totalAmount should be consistent.
                // However, existing logic passed from storage.ts seemed to rely on input or calculation.
                // Let's recalculate based on rule: (remaining + outgoing) * unitPrice = totalAmount
                const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : Number(item.unitPrice || 0);
                const quantity = item.remaining || 0; // "재고현황"
                const outgoingCount = item.outgoing || 0; // "현장팀보유재고"

                if (existing) {
                    if (mode === 'overwrite') {
                        // Overwrite: Update existing item completely
                        const totalAmount = (quantity + outgoingCount) * unitPrice;
                        const [updated] = await tx.update(inventoryItems)
                            .set({
                                ...item,
                                totalAmount: totalAmount,
                                unitPrice: unitPrice,
                            })
                            .where(eq(inventoryItems.id, existing.id))
                            .returning();
                        results.push(updated);
                    } else {
                        // Add (Append): Sum quantities
                        const newRemaining = (existing.remaining || 0) + quantity;
                        const newOutgoing = (existing.outgoing || 0) + outgoingCount;
                        // Weighted average price could be complex, for now assume latest price or keep existing?
                        // "이어쓰기" usually implies adding stock. Let's update price to latest and recalc amount.
                        const newTotalAmount = (newRemaining + newOutgoing) * unitPrice;

                        const [updated] = await tx.update(inventoryItems)
                            .set({
                                remaining: newRemaining,
                                outgoing: newOutgoing,
                                unitPrice: unitPrice,
                                totalAmount: newTotalAmount,
                            })
                            .where(eq(inventoryItems.id, existing.id))
                            .returning();
                        results.push(updated);
                    }
                } else {
                    // Create new
                    const totalAmount = (quantity + outgoingCount) * unitPrice;
                    const [created] = await tx.insert(inventoryItems).values({
                        ...item,
                        totalAmount: totalAmount,
                        unitPrice: unitPrice
                    }).returning();
                    results.push(created);
                }
            }
            return results;
        });
    }

    // Incoming
    async getIncomingRecords(tenantId: string): Promise<IncomingRecord[]> {
        return await db.select().from(incomingRecords)
            .where(eq(incomingRecords.tenantId, tenantId))
            .orderBy(desc(incomingRecords.date), desc(incomingRecords.id));
    }

    async getIncomingRecord(id: number, tenantId: string): Promise<IncomingRecord | undefined> {
        const [record] = await db.select().from(incomingRecords).where(and(eq(incomingRecords.id, id), eq(incomingRecords.tenantId, tenantId)));
        return record;
    }

    async createIncomingRecord(record: InsertIncomingRecord): Promise<IncomingRecord> {
        const [newRecord] = await db.insert(incomingRecords).values(record).returning();
        return newRecord;
    }

    async updateIncomingRecord(id: number, updates: Partial<InsertIncomingRecord>, tenantId: string): Promise<IncomingRecord | undefined> {
        const [updated] = await db.update(incomingRecords)
            .set(updates)
            .where(and(eq(incomingRecords.id, id), eq(incomingRecords.tenantId, tenantId)))
            .returning();
        return updated;
    }

    async deleteIncomingRecord(id: number, tenantId: string): Promise<boolean> {
        const [deleted] = await db.delete(incomingRecords)
            .where(and(eq(incomingRecords.id, id), eq(incomingRecords.tenantId, tenantId)))
            .returning();
        return !!deleted;
    }

    async bulkDeleteIncomingRecords(ids: number[], tenantId: string): Promise<number> {
        if (ids.length === 0) return 0;
        const result = await db.delete(incomingRecords)
            .where(and(
                inArray(incomingRecords.id, ids),
                eq(incomingRecords.tenantId, tenantId)
            ))
            .returning();
        return result.length;
    }

    async createIncomingRecordsBulk(records: InsertIncomingRecord[], tenantId: string): Promise<IncomingRecord[]> {
        return await db.transaction(async (tx) => {
            const results: IncomingRecord[] = [];
            for (const record of records) {
                // 1. Create Record
                const [created] = await tx.insert(incomingRecords).values(record).returning();
                results.push(created);

                // 2. Update Inventory (Add stock)
                const [existingItem] = await tx.select().from(inventoryItems).where(and(
                    eq(inventoryItems.tenantId, tenantId),
                    eq(inventoryItems.division, record.division || "SKT"),
                    eq(inventoryItems.productName, record.productName),
                    eq(inventoryItems.specification, record.specification || "")
                ));

                const incomingQty = record.quantity || 0;

                if (existingItem) {
                    const newRemaining = (existingItem.remaining || 0) + incomingQty;
                    const unitPrice = parseFloat(existingItem.unitPrice?.toString() || "0");
                    const totalAmount = (newRemaining + (existingItem.outgoing || 0)) * unitPrice;

                    await tx.update(inventoryItems)
                        .set({
                            remaining: newRemaining,
                            totalAmount: totalAmount,

                        })
                        .where(eq(inventoryItems.id, existingItem.id));
                } else {
                    // If item doesn't exist, create it?
                    // Policy check: Should we auto-create items on incoming? Yes, usually.
                    // But price is unknown if not in incoming record? Incoming record has no price field in standard schema usually, wait.. 
                    // incomingRecords schema usually has standard fields. Let's assume price 0 or minimal.
                    // However, typical flow implies items exist. But let's safe guard.
                    await tx.insert(inventoryItems).values({
                        tenantId,
                        division: record.division || "SKT",
                        category: record.category || "기본",
                        productName: record.productName,
                        specification: record.specification || "",
                        remaining: incomingQty,
                        outgoing: 0,
                        unitPrice: 0,
                        totalAmount: 0
                    });
                }
            }
            return results;
        });
    }

    // Outgoing
    async getOutgoingRecords(tenantId: string): Promise<OutgoingRecord[]> {
        const records = await db.select().from(outgoingRecords)
            .where(eq(outgoingRecords.tenantId, tenantId))
            .orderBy(desc(outgoingRecords.date), desc(outgoingRecords.id));

        // Post-process to remove large data from attributes if necessary
        return records.map(record => {
            if (record.attributes) {
                try {
                    const attr = JSON.parse(record.attributes);
                    // If 'data' exists (base64 file), remove it for the list view
                    if (attr && attr.data) {
                        delete attr.data;
                        return { ...record, attributes: JSON.stringify(attr) };
                    }
                } catch (e) {
                    // ignore parse errors
                }
            }
            return record;
        });
    }

    async getOutgoingRecord(id: number, tenantId: string): Promise<OutgoingRecord | undefined> {
        return await db.query.outgoingRecords.findFirst({
            where: and(eq(outgoingRecords.id, id), eq(outgoingRecords.tenantId, tenantId))
        });
    }

    async createOutgoingRecord(record: InsertOutgoingRecord): Promise<OutgoingRecord> {
        const [newRecord] = await db.insert(outgoingRecords).values(record).returning();
        return newRecord;
    }

    async updateOutgoingRecord(id: number, updates: Partial<InsertOutgoingRecord>, tenantId: string): Promise<OutgoingRecord | undefined> {
        const [updated] = await db.update(outgoingRecords)
            .set(updates)
            .where(and(eq(outgoingRecords.id, id), eq(outgoingRecords.tenantId, tenantId)))
            .returning();
        return updated;
    }

    async deleteOutgoingRecord(id: number, tenantId: string): Promise<boolean> {
        const [deleted] = await db.delete(outgoingRecords)
            .where(and(eq(outgoingRecords.id, id), eq(outgoingRecords.tenantId, tenantId)))
            .returning();
        return !!deleted;
    }

    async bulkDeleteOutgoingRecords(ids: number[], tenantId: string): Promise<number> {
        if (ids.length === 0) return 0;
        const result = await db.delete(outgoingRecords)
            .where(and(
                inArray(outgoingRecords.id, ids),
                eq(outgoingRecords.tenantId, tenantId)
            ))
            .returning();
        return result.length;
    }

    async clearOutgoingRecords(tenantId: string): Promise<void> {
        await db.delete(outgoingRecords).where(eq(outgoingRecords.tenantId, tenantId));
    }

    async bulkCreateOutgoingRecords(records: InsertOutgoingRecord[]): Promise<OutgoingRecord[]> {
        if (records.length === 0) return [];
        return await db.insert(outgoingRecords).values(records).returning();
    }

    async initializeOutgoingRecords(): Promise<void> {
        // Legacy: Keep empty or implement if needed
    }

    // Material Usage
    async getMaterialUsageRecords(tenantId: string): Promise<MaterialUsageRecord[]> {
        const records = await db.select().from(materialUsageRecords)
            .where(eq(materialUsageRecords.tenantId, tenantId))
            .orderBy(desc(materialUsageRecords.date), desc(materialUsageRecords.id));

        return records.map(record => {
            if (record.attributes) {
                try {
                    const attrs = JSON.parse(record.attributes);
                    if (attrs.data) {
                        delete attrs.data;
                        return { ...record, attributes: JSON.stringify(attrs) };
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
            return record;
        });
    }

    async getMaterialUsageRecord(id: number, tenantId: string): Promise<MaterialUsageRecord | undefined> {
        return await db.query.materialUsageRecords.findFirst({
            where: and(eq(materialUsageRecords.id, id), eq(materialUsageRecords.tenantId, tenantId))
        });
    }

    async createMaterialUsageRecord(record: InsertMaterialUsageRecord): Promise<MaterialUsageRecord> {
        const [newRecord] = await db.insert(materialUsageRecords).values(record).returning();
        return newRecord;
    }

    async updateMaterialUsageRecord(id: number, updates: Partial<InsertMaterialUsageRecord>, tenantId: string): Promise<MaterialUsageRecord | undefined> {
        const [updated] = await db.update(materialUsageRecords)
            .set(updates)
            .where(and(eq(materialUsageRecords.id, id), eq(materialUsageRecords.tenantId, tenantId)))
            .returning();
        return updated;
    }

    async deleteMaterialUsageRecord(id: number, tenantId: string): Promise<boolean> {
        const [deleted] = await db.delete(materialUsageRecords)
            .where(and(eq(materialUsageRecords.id, id), eq(materialUsageRecords.tenantId, tenantId)))
            .returning();
        return !!deleted;
    }

    async bulkDeleteMaterialUsageRecords(ids: number[], tenantId: string): Promise<number> {
        if (ids.length === 0) return 0;
        const result = await db.delete(materialUsageRecords)
            .where(and(
                inArray(materialUsageRecords.id, ids),
                eq(materialUsageRecords.tenantId, tenantId)
            ))
            .returning();
        return result.length;
    }

    async getTeamItemStock(tenantId: string, teamCategory: string, productName: string, specification: string, division: string): Promise<number> {
        // 1. Calculate Total Outgoing to this team (or category)
        // Note: 'teamCategory' usage in Outgoing is actually storing Team Name or "외주팀" etc.
        // Ideally we match by teamId if possible, but legacy logic uses category/name matching often.
        // Let's match by teamCategory (string) field in outgoingRecords.
        const outgoing = await db.select({
            total: sql<number>`sum(${outgoingRecords.quantity})`
        })
            .from(outgoingRecords)
            .where(and(
                eq(outgoingRecords.tenantId, tenantId),
                eq(outgoingRecords.teamCategory, teamCategory),
                eq(outgoingRecords.productName, productName),
                eq(outgoingRecords.specification, specification),
                eq(outgoingRecords.division, division)
            ));

        // 2. Calculate Total Usage by this team
        const usage = await db.select({
            total: sql<number>`sum(${materialUsageRecords.quantity})`
        })
            .from(materialUsageRecords)
            .where(and(
                eq(materialUsageRecords.tenantId, tenantId),
                eq(materialUsageRecords.teamCategory, teamCategory),
                eq(materialUsageRecords.productName, productName),
                eq(materialUsageRecords.specification, specification),
                eq(materialUsageRecords.division, division)
            ));

        const totalIn = outgoing[0]?.total || 0;
        const totalOut = usage[0]?.total || 0;

        return Number(totalIn) - Number(totalOut);
    }

    async calculateInventoryStats(tenantId: string, productName: string, specification: string, division: string): Promise<{ totalIncoming: number; totalSentToTeam: number; totalUsage: number }> {
        // 1. Total Incoming
        const incoming = await db.select({
            total: sql<number>`sum(${incomingRecords.quantity})`
        })
            .from(incomingRecords)
            .where(and(
                eq(incomingRecords.tenantId, tenantId),
                eq(incomingRecords.productName, productName),
                eq(incomingRecords.specification, specification),
                eq(incomingRecords.division, division)
            ));

        // 2. Total Outgoing (Sent to Team from Office)
        const outgoing = await db.select({
            total: sql<number>`sum(${outgoingRecords.quantity})`
        })
            .from(outgoingRecords)
            .where(and(
                eq(outgoingRecords.tenantId, tenantId),
                eq(outgoingRecords.productName, productName),
                eq(outgoingRecords.specification, specification),
                eq(outgoingRecords.division, division)
            ));

        // 3. Total Usage (Used by Teams)
        const usage = await db.select({
            total: sql<number>`sum(${materialUsageRecords.quantity})`
        })
            .from(materialUsageRecords)
            .where(and(
                eq(materialUsageRecords.tenantId, tenantId),
                eq(materialUsageRecords.productName, productName),
                eq(materialUsageRecords.specification, specification),
                eq(materialUsageRecords.division, division)
            ));

        return {
            totalIncoming: Number(incoming[0]?.total || 0),
            totalSentToTeam: Number(outgoing[0]?.total || 0),
            totalUsage: Number(usage[0]?.total || 0)
        };
    }
}
