import type { Express } from "express";
import { storage } from "../storage.js";
import { db } from "../db.js";
import {
    apiInsertInventoryItemSchema,
    apiInsertOutgoingRecordSchema,
    apiInsertMaterialUsageRecordSchema,
    apiInsertIncomingRecordSchema,
    materialUsageRecords
} from "../../shared/schema.js";
import { requireAuth, requireTenant, requireAdmin } from "../middleware/auth.js";
import { uploadFile, getPublicUrl, base64ToBuffer, getMimeType } from "../lib/storage.js";
import { processAttachments } from "./inventory-helpers.js";

// Helper function to sync inventory items
export async function syncInventoryItem(
    productName: string,
    specification: string,
    division: string,
    tenantId: string
) {
    console.log(`[SYNC] Recalculating inventory for: ${productName} (${specification}) [${division}]`);

    const inventoryItemsList = await storage.getInventoryItems(tenantId);
    const matchingItem = inventoryItemsList.find(
        item => item.productName.trim() === productName.trim() &&
            (item.specification || "").trim() === (specification || "").trim() &&
            item.division.trim() === division.trim()
    );

    if (!matchingItem) {
        console.log(`[SYNC] No inventory item found for: ${productName} (${specification}) [${division}]`);
        return;
    }

    const stats = await storage.calculateInventoryStats(tenantId, productName, specification, division);
    const { totalIncoming, totalSentToTeam, totalUsage } = stats;

    const officeStock = Number(matchingItem.carriedOver || 0) + Number(totalIncoming) - Number(totalSentToTeam);
    const teamStock = Number(totalSentToTeam) - Number(totalUsage);
    const totalStock = officeStock + teamStock;

    console.log(`[SYNC] New totals - Incoming: ${totalIncoming}, Sent: ${totalSentToTeam}, Usage: ${totalUsage}`);
    console.log(`[SYNC] Stocks - Office: ${officeStock}, Team: ${teamStock}, Total: ${totalStock}`);

    await storage.updateInventoryItem(matchingItem.id, {
        incoming: totalIncoming,
        outgoing: totalSentToTeam,
        usage: totalUsage,
        remaining: officeStock,
        totalAmount: isNaN(totalStock * Number(matchingItem.unitPrice || 0)) ? 0 : totalStock * Number(matchingItem.unitPrice || 0)
    }, tenantId);
}

export function registerInventoryRoutes(app: Express) {
    // Inventory API
    app.get("/api/inventory", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const items = await storage.getInventoryItems(tenantId);
        res.json(items);
    });

    app.get("/api/inventory/:id", requireAuth, requireTenant, async (req, res) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const tenantId = req.session!.tenantId!;
        const item = await storage.getInventoryItem(id, tenantId);

        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }
        res.json(item);
    });

    app.post("/api/inventory", requireAuth, requireTenant, async (req, res) => {
        console.log("POST /api/inventory - body:", JSON.stringify(req.body, null, 2));
        const schemaKeys = (apiInsertInventoryItemSchema as any)._def?.shape ? Object.keys((apiInsertInventoryItemSchema as any)._def.shape()) : "unknown";
        console.log("apiInsertInventoryItemSchema keys:", schemaKeys);

        const parseResult = apiInsertInventoryItemSchema.safeParse(req.body);
        if (!parseResult.success) {
            console.log("POST /api/inventory - validation failed:", JSON.stringify(parseResult.error.format(), null, 2));
            return res.status(400).json({
                error: parseResult.error.message,
                details: parseResult.error.format(),
                schemaKeys: schemaKeys
            });
        }

        const tenantId = req.session!.tenantId!;

        try {
            const item = await storage.createInventoryItem({
                ...parseResult.data,
                productName: parseResult.data.productName.trim(),
                specification: parseResult.data.specification.trim(),
                division: (parseResult.data.division || "SKT").trim(),
                category: parseResult.data.category.trim(),
                tenantId,
                createdBy: req.session!.userId!
            });
            res.status(201).json(item);
        } catch (error: any) {
            if (error.message === "Item already exists") {
                return res.status(409).json({ error: "이미 존재하는 자재입니다." });
            }
            throw error;
        }
    });

    app.patch("/api/inventory/:id", requireAuth, requireTenant, async (req, res) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const tenantId = req.session!.tenantId!;
        const updates = { ...req.body };
        if (updates.productName) updates.productName = updates.productName.trim();
        if (updates.specification) updates.specification = updates.specification.trim();
        if (updates.division) updates.division = updates.division.trim();
        if (updates.category) updates.category = updates.category.trim();

        const item = await storage.updateInventoryItem(id, updates, tenantId);

        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }
        res.json(item);
    });

    app.delete("/api/inventory/:id", requireAuth, requireTenant, async (req, res) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const tenantId = req.session!.tenantId!;
        const success = await storage.deleteInventoryItem(id, tenantId);

        if (!success) {
            return res.status(404).json({ error: "Item not found" });
        }
        res.status(204).send();
    });

    app.post("/api/inventory/bulk", requireAuth, requireTenant, async (req, res) => {
        const { items, mode } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: "Items must be an array" });
        }

        const tenantId = req.session!.tenantId!;
        try {
            const createdItems = await storage.syncInventoryItems(items.map((i: any) => ({ ...i, tenantId })), tenantId, mode);
            res.status(201).json(createdItems);
        } catch (error: any) {
            console.error("Bulk inventory upload error:", error);
            res.status(500).json({ error: "Failed to process bulk upload: " + error.message });
        }
    });

    app.post("/api/inventory/bulk-delete", requireAuth, requireTenant, async (req, res) => {
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ error: "IDs must be an array" });
        }

        const tenantId = req.session!.tenantId!;
        const deletedCount = await storage.bulkDeleteInventoryItems(ids, tenantId);
        res.json({ deletedCount });
    });

    // Outgoing Records API
    app.get("/api/outgoing", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const records = await storage.getOutgoingRecords(tenantId);
        // Debug Log
        if (records.length > 0) {
            console.log("[DEBUG_GET_OUTGOING] Sample attributes:", records[0].attributes ? (typeof records[0].attributes === 'string' ? records[0].attributes.substring(0, 100) : JSON.stringify(records[0].attributes).substring(0, 100)) : "null");
        }
        res.json(records);
    });

    app.get("/api/outgoing/:id", requireAuth, requireTenant, async (req, res) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const tenantId = req.session!.tenantId!;
        const record = await storage.getOutgoingRecord(id, tenantId);

        if (!record) {
            return res.status(404).json({ error: "Record not found" });
        }
        res.json(record);
    });



    app.post("/api/outgoing", requireAuth, requireTenant, async (req, res) => {
        try {
            const parseResult = apiInsertOutgoingRecordSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json({ error: parseResult.error.message });
            }

            const tenantId = req.session!.tenantId!;

            const productName = parseResult.data.productName.trim();
            const specification = parseResult.data.specification.trim();
            const division = (parseResult.data.division || "SKT").trim();
            const category = "";
            const teamCategory = parseResult.data.teamCategory.trim();
            const projectName = parseResult.data.projectName.trim();
            const recipient = parseResult.data.recipient.trim();

            const inventoryItemsList = await storage.getInventoryItems(tenantId);

            // inventoryItemId가 있으면 ID로 직접 매칭, 없으면 품명/규격/사업으로 매칭
            let targetItem;
            if (parseResult.data.inventoryItemId) {
                targetItem = inventoryItemsList.find(item => item.id === parseResult.data.inventoryItemId);
            } else {
                targetItem = inventoryItemsList.find(item =>
                    item.productName.trim() === productName &&
                    item.specification.trim() === specification &&
                    item.division.trim() === division
                );
            }

            if (!targetItem) {
                return res.status(400).json({ error: "해당 자재가 재고 목록에 존재하지 않습니다." });
            }

            if (targetItem.remaining < parseResult.data.quantity) {
                return res.status(400).json({
                    error: `재고가 부족합니다 (잔여: ${targetItem.remaining.toLocaleString()}, 요청: ${parseResult.data.quantity.toLocaleString()})`
                });
            }

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
                        // Handle legacy single attachment structure by wrapping in array for processing
                        const uploadedFiles = await processAttachments([attrs.attachment]);
                        attributesObj.attachment = uploadedFiles[0];
                    }
                } catch (e) {
                    console.error('[OUTGOING] Attachment processing error:', e);
                }
            }

            const record = await storage.createOutgoingRecord({
                ...parseResult.data,
                attributes: Object.keys(attributesObj).length > 0 ? JSON.stringify(attributesObj) : parseResult.data.attributes,
                productName,
                specification,
                division,
                category,
                teamCategory,
                projectName,
                recipient,
                tenantId,
                createdBy: req.session!.userId!
            });

            await syncInventoryItem(productName, specification, division, tenantId);

            res.status(201).json(record);
        } catch (error: any) {
            console.error("[OUTGOING] POST Error:", error);
            res.status(500).json({ error: "출고 등록 중 오류가 발생했습니다: " + error.message });
        }
    });

    app.patch("/api/outgoing/:id", requireAuth, requireTenant, async (req, res) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const tenantId = req.session!.tenantId!;
        const oldRecord = await storage.getOutgoingRecord(id, tenantId);

        const updates = { ...req.body };
        if (updates.productName) updates.productName = updates.productName.trim();
        if (updates.specification) updates.specification = updates.specification.trim();
        if (updates.division) updates.division = updates.division.trim();
        if (updates.teamCategory) updates.teamCategory = updates.teamCategory.trim();
        if (updates.projectName) updates.projectName = updates.projectName.trim();
        if (updates.recipient) updates.recipient = updates.recipient.trim();

        const record = await storage.updateOutgoingRecord(id, updates, tenantId);

        if (!record) {
            return res.status(404).json({ error: "Record not found" });
        }

        if (oldRecord) {
            await syncInventoryItem(oldRecord.productName, oldRecord.specification, oldRecord.division, tenantId);
        }
        if (record && (record.productName !== oldRecord?.productName || record.specification !== oldRecord?.specification || record.division !== oldRecord?.division)) {
            await syncInventoryItem(record.productName, record.specification, record.division, tenantId);
        }

        res.json(record);
    });

    app.delete("/api/outgoing/:id", requireAuth, requireTenant, async (req, res) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const tenantId = req.session!.tenantId!;
        const record = await storage.getOutgoingRecord(id, tenantId);
        const success = await storage.deleteOutgoingRecord(id, tenantId);

        if (!success) {
            return res.status(404).json({ error: "Record not found" });
        }

        if (record) {
            await syncInventoryItem(record.productName, record.specification, record.division, tenantId);
        }

        res.status(204).send();
    });

    app.post("/api/outgoing/bulk-delete", requireAuth, requireTenant, async (req, res) => {
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ error: "IDs must be an array" });
        }

        const tenantId = req.session!.tenantId!;
        const records = await storage.getOutgoingRecords(tenantId);
        const recordsToDelete = records.filter(r => ids.includes(r.id));

        const deletedCount = await storage.bulkDeleteOutgoingRecords(ids, tenantId);

        const itemsToSync = new Set(recordsToDelete.map(r => `${r.productName}|${r.specification}|${r.division}`));
        await Promise.all(Array.from(itemsToSync).map(async (itemKey) => {
            const [productName, specification, division] = itemKey.split('|');
            await syncInventoryItem(productName, specification, division, tenantId);
        }));

        res.json({ deletedCount });
    });

    // ... (bulk upload omitted for brevity, logic is similar if needed later)

    app.get("/api/material-usage", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const { teamCategory } = req.query;
        const categoryFilter = typeof teamCategory === 'string' ? teamCategory : undefined;

        try {
            const records = await storage.getMaterialUsageRecords(tenantId, categoryFilter);
            res.json(records);
        } catch (error) {
            console.error("Fetch material usage records error:", error);
            res.status(500).json({ error: "사용 내역을 가져오는 중 오류가 발생했습니다" });
        }
    });

    app.post("/api/material-usage", requireAuth, requireTenant, async (req, res) => {
        try {
            const parseResult = apiInsertMaterialUsageRecordSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json({ error: parseResult.error.message });
            }

            const tenantId = req.session!.tenantId!;

            // inventoryItemId가 필수입니다
            if (!parseResult.data.inventoryItemId) {
                return res.status(400).json({ error: "inventoryItemId가 필요합니다. 품목을 다시 선택해주세요." });
            }

            const teamStock = await storage.getTeamItemStock(
                tenantId,
                parseResult.data.teamCategory,
                parseResult.data.inventoryItemId
            );

            if (teamStock < parseResult.data.quantity) {
                return res.status(400).json({
                    error: `팀 보유 재고가 부족합니다 (보유: ${teamStock.toLocaleString()}, 사용시도: ${parseResult.data.quantity.toLocaleString()})`
                });
            }

            const productName = parseResult.data.productName.trim();
            const specification = parseResult.data.specification.trim();
            const division = (parseResult.data.division || "SKT").trim();
            const projectName = parseResult.data.projectName.trim();

            console.log(`[USAGE] 공사명 저장 확인 - 요청: "${parseResult.data.projectName}" → 처리: "${projectName}"`);

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
                    console.error('[USAGE] Attachment processing error:', e);
                }
            }

            const record = await storage.createMaterialUsageRecord({
                ...parseResult.data,
                attributes: Object.keys(attributesObj).length > 0 ? JSON.stringify(attributesObj) : parseResult.data.attributes,
                productName,
                specification,
                division,
                category: (parseResult.data.category || "").trim(),
                teamCategory: parseResult.data.teamCategory.trim(),
                projectName,
                recipient: parseResult.data.recipient.trim(),
                tenantId,
                createdBy: req.session!.userId!
            });

            console.log(`[USAGE] 저장 완료 - ID: ${record.id}, 공사명: "${record.projectName}"`);

            await syncInventoryItem(productName, specification, division, tenantId);

            res.status(201).json(record);
        } catch (error: any) {
            console.error("[USAGE] POST Error:", error);
            res.status(500).json({ error: "사용 등록 중 오류가 발생했습니다: " + error.message });
        }
    });

    app.get("/api/material-usage/:id", requireAuth, requireTenant, async (req, res) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const tenantId = req.session!.tenantId!;
        const record = await storage.getMaterialUsageRecord(id, tenantId);

        if (!record) {
            return res.status(404).json({ error: "Record not found" });
        }
        res.json(record);
    });

    app.patch("/api/material-usage/:id", requireAuth, requireTenant, async (req, res) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const tenantId = req.session!.tenantId!;
        const oldRecord = await storage.getMaterialUsageRecord(id, tenantId);

        const updates = { ...req.body };
        if (updates.productName) updates.productName = updates.productName.trim();
        if (updates.specification) updates.specification = updates.specification.trim();
        if (updates.division) updates.division = updates.division.trim();
        if (updates.category) updates.category = updates.category.trim();
        if (updates.teamCategory) updates.teamCategory = updates.teamCategory.trim();
        if (updates.projectName) updates.projectName = updates.projectName.trim();
        if (updates.recipient) updates.recipient = updates.recipient.trim();

        const record = await storage.updateMaterialUsageRecord(id, updates, tenantId);

        if (!record) {
            return res.status(404).json({ error: "Record not found" });
        }

        if (oldRecord) {
            await syncInventoryItem(oldRecord.productName, oldRecord.specification, oldRecord.division, tenantId);
        }
        if (record && (record.productName !== oldRecord?.productName || record.specification !== oldRecord?.specification || record.division !== oldRecord?.division)) {
            await syncInventoryItem(record.productName, record.specification, record.division, tenantId);
        }

        res.json(record);
    });

    app.delete("/api/material-usage/:id", requireAuth, requireTenant, async (req, res) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const tenantId = req.session!.tenantId!;
        const record = await storage.getMaterialUsageRecord(id, tenantId);
        const success = await storage.deleteMaterialUsageRecord(id, tenantId);

        if (!success) {
            return res.status(404).json({ error: "Record not found" });
        }

        if (record) {
            await syncInventoryItem(record.productName, record.specification, record.division, tenantId);
        }

        res.status(204).send();
    });

    app.post("/api/material-usage/bulk-delete", requireAuth, requireAdmin, async (req, res) => {
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ error: "IDs must be an array" });
        }

        const tenantId = req.session!.tenantId!;
        const records = await storage.getMaterialUsageRecords(tenantId);
        const recordsToDelete = records.filter(r => ids.includes(r.id));

        const deletedCount = await storage.bulkDeleteMaterialUsageRecords(ids, tenantId);

        const itemsToSync = new Set(recordsToDelete.map(r => `${r.productName}|${r.specification}|${r.division}`));
        await Promise.all(Array.from(itemsToSync).map(async (itemKey) => {
            const [productName, specification, division] = itemKey.split('|');
            await syncInventoryItem(productName, specification, division, tenantId);
        }));

        res.json({ deletedCount });
    });

    // Incoming Records API
    app.get("/api/incoming", requireAuth, requireTenant, async (req, res) => {
        const tenantId = req.session!.tenantId!;
        const records = await storage.getIncomingRecords(tenantId);
        res.json(records);
    });

    app.get("/api/incoming/:id", requireAuth, requireTenant, async (req, res) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const tenantId = req.session!.tenantId!;
        const record = await storage.getIncomingRecord(id, tenantId);

        if (!record) {
            return res.status(404).json({ error: "Record not found" });
        }
        res.json(record);
    });

    app.post("/api/incoming", requireAuth, requireTenant, async (req, res) => {
        try {
            const parseResult = apiInsertIncomingRecordSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json({ error: parseResult.error.message });
            }

            const tenantId = req.session!.tenantId!;

            const productName = parseResult.data.productName.trim();
            const specification = (parseResult.data.specification || "").trim();
            const division = (parseResult.data.division || "SKT").trim();

            // Process attachments - upload to Storage
            let attributesObj: any = {};
            if (parseResult.data.attributes) {
                try {
                    const attrs = typeof parseResult.data.attributes === 'string'
                        ? JSON.parse(parseResult.data.attributes)
                        : parseResult.data.attributes;

                    // Handle attachments array
                    if (attrs.attachments && Array.isArray(attrs.attachments)) {
                        const uploadedFiles = await Promise.all(
                            attrs.attachments.map(async (file: any, idx: number) => {
                                // Skip if already uploaded (has storageUrl)
                                if (file.storageUrl) return file;

                                // Upload Base64 to Storage
                                const buffer = base64ToBuffer(file.data);
                                const timestamp = Date.now();
                                const mimeType = getMimeType(file.name);
                                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                                const path = `incoming/${timestamp}_${idx}_${safeName}`;

                                await uploadFile('attachments', path, buffer, mimeType);
                                const storageUrl = getPublicUrl('attachments', path);

                                return {
                                    name: file.name,
                                    storageUrl,
                                    storagePath: path,
                                };
                            })
                        );

                        attributesObj.attachments = uploadedFiles;
                        attributesObj.attachment = uploadedFiles[0]; // Legacy support
                    } else if (attrs.attachment) {
                        // Single attachment (legacy)
                        const file = attrs.attachment;
                        if (!file.storageUrl && file.data) {
                            const buffer = base64ToBuffer(file.data);
                            const timestamp = Date.now();
                            const mimeType = getMimeType(file.name);
                            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                            const path = `incoming/${timestamp}_${safeName}`;

                            await uploadFile('attachments', path, buffer, mimeType);
                            const storageUrl = getPublicUrl('attachments', path);

                            attributesObj.attachment = {
                                name: file.name,
                                storageUrl,
                                storagePath: path,
                            };
                        } else {
                            attributesObj.attachment = file;
                        }
                    }
                } catch (e) {
                    console.error('[INCOMING] Attachment processing error:', e);
                    // Continue without attachments if processing fails
                }
            }

            const inventoryItemsList = await storage.getInventoryItems(tenantId);
            const matchingItem = inventoryItemsList.find(
                item => item.productName === productName &&
                    item.specification === specification &&
                    item.division === division
            );

            let targetInventoryId: number;

            if (matchingItem) {
                targetInventoryId = matchingItem.id;
            } else {
                const unitPrice = parseResult.data.unitPrice ?? 0;
                const newItem = await storage.createInventoryItem({
                    tenantId,
                    division,
                    category: division,
                    productName,
                    specification,
                    carriedOver: 0,
                    incoming: 0,
                    outgoing: 0,
                    remaining: 0,
                    unitPrice: unitPrice,
                    totalAmount: 0,
                    createdBy: req.session!.userId!
                });
                targetInventoryId = newItem.id;
            }

            const record = await storage.createIncomingRecord({
                ...parseResult.data,
                attributes: Object.keys(attributesObj).length > 0 ? JSON.stringify(attributesObj) : parseResult.data.attributes,
                inventoryItemId: targetInventoryId, // Link to Inventory Item
                productName,
                specification,
                division,
                category: (parseResult.data.category || "").trim(),
                supplier: parseResult.data.supplier.trim(),
                projectName: parseResult.data.projectName.trim(),
                tenantId,
                createdBy: req.session!.userId!
            });

            await syncInventoryItem(productName, specification, division, tenantId);

            res.status(201).json(record);
        } catch (error: any) {
            console.error("[INCOMING] POST Error:", error);
            res.status(500).json({ error: "입고 등록 중 오류가 발생했습니다: " + error.message });
        }
    });

    app.post("/api/incoming/bulk", requireAuth, requireTenant, async (req, res) => {
        const { items, mode } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: "Items must be an array" });
        }

        const tenantId = req.session!.tenantId!;
        try {
            const sharedCreatedAt = new Date();
            const inventoryItemsList = await storage.getInventoryItems(tenantId);

            const recordsToCreate = [];
            for (const item of items) {
                const productName = (item.productName || "").trim();
                const specification = (item.specification || "").trim();
                const division = (item.division || "SKT").trim();
                const unitPrice = item.unitPrice ?? 0;

                let targetItem = inventoryItemsList.find(inv =>
                    inv.productName === productName &&
                    inv.specification === specification &&
                    inv.division === division
                );

                if (!targetItem) {
                    // Create if not exists (Synchronous to ensure ID is available)
                    targetItem = await storage.createInventoryItem({
                        tenantId,
                        division,
                        category: division,
                        productName,
                        specification,
                        carriedOver: 0,
                        incoming: 0,
                        outgoing: 0,
                        remaining: 0,
                        unitPrice: unitPrice,
                        totalAmount: 0,
                        createdBy: req.session!.userId!
                    });
                    // Add to local list to avoid duplicates in this loop if same item appears multiple times
                    inventoryItemsList.push(targetItem);
                }

                recordsToCreate.push({
                    ...item,
                    inventoryItemId: targetItem.id, // Set Inventory ID
                    productName,
                    specification,
                    division,
                    tenantId,
                    createdBy: req.session!.userId!,
                    createdAt: sharedCreatedAt
                });
            }

            const createdRecords = await storage.createIncomingRecordsBulk(recordsToCreate, tenantId);

            const uniqueItems = new Set(createdRecords.map(r =>
                `${r.productName}|${r.specification || ""}|${r.division}`
            ));

            for (const key of Array.from(uniqueItems)) {
                const [p, s, d] = key.split('|');
                await syncInventoryItem(p, s || "", d, tenantId);
            }

            res.status(201).json(createdRecords);
        } catch (error: any) {
            console.error("Bulk incoming upload error:", error);
            res.status(500).json({ error: "일괄 입고 등록 중 오류가 발생했습니다: " + error.message });
        }
    });

    app.patch("/api/incoming/:id", requireAuth, requireTenant, async (req, res) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const tenantId = req.session!.tenantId!;
        const oldRecord = await storage.getIncomingRecord(id, tenantId);

        const updates = { ...req.body };
        if (updates.productName) updates.productName = updates.productName.trim();
        if (updates.specification) updates.specification = updates.specification.trim();
        if (updates.division) updates.division = updates.division.trim();
        if (updates.category) updates.category = updates.category.trim();
        if (updates.supplier) updates.supplier = updates.supplier.trim();
        if (updates.projectName) updates.projectName = updates.projectName.trim();

        const record = await storage.updateIncomingRecord(id, updates, tenantId);

        if (!record) {
            return res.status(404).json({ error: "Record not found" });
        }

        if (oldRecord) {
            await syncInventoryItem(oldRecord.productName, oldRecord.specification || "", oldRecord.division, tenantId);
        }
        if (record && (record.productName !== oldRecord?.productName || record.specification !== oldRecord?.specification || record.division !== oldRecord?.division)) {
            await syncInventoryItem(record.productName, record.specification || "", record.division, tenantId);
        }

        res.json(record);
    });

    app.delete("/api/incoming/:id", requireAuth, requireTenant, async (req, res) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const tenantId = req.session!.tenantId!;
        const record = await storage.getIncomingRecord(id, tenantId);
        const success = await storage.deleteIncomingRecord(id, tenantId);

        if (!success) {
            return res.status(404).json({ error: "Record not found" });
        }

        if (record) {
            await syncInventoryItem(record.productName, record.specification || "", record.division, tenantId);
        }

        res.status(204).send();
    });

    app.post("/api/incoming/bulk-delete", requireAuth, requireTenant, async (req, res) => {
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ error: "IDs must be an array" });
        }

        const tenantId = req.session!.tenantId!;
        const records = await storage.getIncomingRecords(tenantId);
        const recordsToDelete = records.filter(r => ids.includes(r.id));

        const deletedCount = await storage.bulkDeleteIncomingRecords(ids, tenantId);

        const itemsToSync = new Set(recordsToDelete.map(r => `${r.productName}|${r.specification || ""}|${r.division}`));
        await Promise.all(Array.from(itemsToSync).map(async (itemKey) => {
            const [productName, specification, division] = itemKey.split('|');
            await syncInventoryItem(productName, specification, division, tenantId);
        }));

        res.json({ deletedCount });
    });

    // Debug Routes
    app.post("/api/debug/recalculate", requireAuth, requireAdmin, async (req, res) => {
        try {
            const tenantId = req.session!.tenantId!;
            const items = await storage.getInventoryItems(tenantId);
            console.log(`[DEBUG] Recalculating ${items.length} items for tenant ${tenantId}`);

            let updatedCount = 0;
            for (const item of items) {
                await syncInventoryItem(item.productName, item.specification, item.division, tenantId);
                updatedCount++;
            }

            res.json({ success: true, message: `Recalculated ${updatedCount} items` });
        } catch (error: any) {
            console.error("Recalculate failed:", error);
            res.status(500).json({ error: error.message });
        }
    });

    app.get("/api/debug/audit", async (req, res) => {
        try {
            const items = await storage.getInventoryItems(req.session!.tenantId!);
            const incoming = await storage.getIncomingRecords(req.session!.tenantId!);
            const outgoing = await storage.getOutgoingRecords(req.session!.tenantId!);
            const usage = await storage.getMaterialUsageRecords(req.session!.tenantId!);

            let mismatches = [];

            for (const item of items) {
                const itemIncoming = incoming
                    .filter(r => r.productName === item.productName && (r.specification || "") === (item.specification || "") && r.division === item.division)
                    .reduce((sum, r) => sum + (r.quantity || 0), 0);

                const itemSentToTeam = outgoing
                    .filter(r => r.productName === item.productName && (r.specification || "") === (item.specification || "") && r.division === item.division)
                    .reduce((sum, r) => sum + (r.quantity || 0), 0);

                const itemUsage = usage
                    .filter(r => r.productName === item.productName && (r.specification || "") === (item.specification || "") && r.division === item.division)
                    .reduce((sum, r) => sum + (r.quantity || 0), 0);

                const expectedRemaining = itemIncoming - itemSentToTeam;
                const expectedOutgoingStored = itemSentToTeam;
                const expectedUsageStored = itemUsage;

                const totalExpectedRemaining = item.carriedOver + expectedRemaining;

                const mismatchRemaining = item.remaining !== totalExpectedRemaining;
                const mismatchSent = item.outgoing !== expectedOutgoingStored;
                const mismatchUsage = item.usage !== expectedUsageStored;

                if (mismatchRemaining || mismatchSent || mismatchUsage) {
                    mismatches.push({
                        item: `${item.division} - ${item.productName}`,
                        db: { remaining: item.remaining, outgoing: item.outgoing, usage: item.usage },
                        calc: { remaining: totalExpectedRemaining, outgoing: expectedOutgoingStored, usage: expectedUsageStored }
                    });
                }
            }

            res.json({ success: true, mismatches, totalItems: items.length });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get("/api/debug/check-project-names", async (req, res) => {
        try {
            const { desc } = await import("drizzle-orm");
            const records = await db
                .select({
                    id: materialUsageRecords.id,
                    date: materialUsageRecords.date,
                    productName: materialUsageRecords.productName,
                    projectName: materialUsageRecords.projectName,
                    recipient: materialUsageRecords.recipient,
                })
                .from(materialUsageRecords)
                .orderBy(desc(materialUsageRecords.id))
                .limit(10);

            const emptyCount = records.filter(r => !r.projectName || r.projectName.trim() === "").length;
            res.json({
                success: true,
                emptyCount,
                records
            });
        } catch (error: any) {
            console.error("Check projects failed:", error);
            res.status(500).json({ error: error.message });
        }
    });
}
