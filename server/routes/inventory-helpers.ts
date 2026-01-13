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

// Helper function to process attachments and upload to Storage
export async function processAttachments(attachments: any[]): Promise<any[]> {
    console.log(`[STORAGE] Processing ${attachments?.length} attachments...`);
    if (!attachments || attachments.length === 0) return [];

    // ...

    const uploadedFiles = await Promise.all(
        attachments.map(async (file: any, idx: number) => {
            // Check if already uploaded (has storageUrl)
            if (file.storageUrl) {
                return file; // Already in new format
            }

            // Upload Base64 to Storage
            const buffer = base64ToBuffer(file.data);
            const timestamp = Date.now();
            const mimeType = getMimeType(file.name);
            // Sanitize filename for Storage path (only allow ASCII alphanumerics, dots, hyphens)
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = `attachments/${timestamp}_${idx}_${safeName}`;

            await uploadFile('attachments', path, buffer, mimeType);
            const storageUrl = getPublicUrl('attachments', path);

            return {
                name: file.name,
                storageUrl,
                storagePath: path,
            };
        })
    );

    return uploadedFiles;
}

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
