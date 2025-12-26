import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { divisions, teams, inventoryItems, outgoingRecords, materialUsageRecords, incomingRecords } from "@shared/schema";
import { insertTeamSchema, insertInventoryItemSchema, insertOutgoingRecordSchema, insertMaterialUsageRecordSchema, insertIncomingRecordSchema } from "@shared/schema";
import { apiInsertTeamSchema, apiInsertInventoryItemSchema, apiInsertOutgoingRecordSchema, apiInsertMaterialUsageRecordSchema, apiInsertIncomingRecordSchema } from "@shared/schema";
import { requireAuth, requireTenant } from "./middleware/auth";
import { eq, and } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // await storage.initializeDivisions();
  // await storage.initializeTeams();
  // await storage.initializeOutgoingRecords();
  console.log("Server routes initialized");

  async function syncInventoryItem(
    productName: string,
    specification: string,
    division: string,
    tenantId: string
  ) {
    console.log(`[SYNC] Recalculating inventory for: ${productName} (${specification}) [${division}]`);

    const inventoryItemsList = await storage.getInventoryItems(tenantId);
    const matchingItem = inventoryItemsList.find(
      item => item.productName === productName &&
        item.specification === specification &&
        item.division === division
    );

    if (!matchingItem) {
      console.log(`[SYNC] No inventory item found for: ${productName}`);
      return;
    }

    const incomingList = await storage.getIncomingRecords(tenantId);
    const totalIncoming = incomingList
      .filter(r => r.productName === productName && (r.specification || "") === specification && r.division === division)
      .reduce((sum, r) => sum + (r.quantity || 0), 0);

    const outgoingList = await storage.getOutgoingRecords(tenantId);
    const totalOutgoingFromRecords = outgoingList
      .filter(r => r.productName === productName && r.specification === specification && r.division === division)
      .reduce((sum, r) => sum + (r.quantity || 0), 0);

    const usageList = await storage.getMaterialUsageRecords(tenantId);
    const totalUsage = usageList
      .filter(r => r.productName === productName && r.specification === specification && r.division === division)
      .reduce((sum, r) => sum + (r.quantity || 0), 0);

    const totalOutgoing = totalOutgoingFromRecords + totalUsage;
    const newRemaining = matchingItem.carriedOver + totalIncoming - totalOutgoing;

    console.log(`[SYNC] New totals - Incoming: ${totalIncoming}, Outgoing: ${totalOutgoing}, Remaining: ${newRemaining}`);

    await storage.updateInventoryItem(matchingItem.id, {
      incoming: totalIncoming,
      outgoing: totalOutgoing,
      remaining: newRemaining,
      totalAmount: newRemaining * matchingItem.unitPrice
    }, tenantId);
  }

  // Divisions API - require authentication and tenant isolation
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

  // Teams API - require authentication and tenant isolation
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

    const teamsWithDivisionName = teamList.map(team => ({
      ...team,
      divisionName: divisionMap.get(team.divisionId) || "",
    }));

    res.json(teamsWithDivisionName);
  });

  app.post("/api/teams", requireAuth, requireTenant, async (req, res) => {
    const parseResult = apiInsertTeamSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.message });
    }

    const tenantId = req.session!.tenantId!;
    const team = await storage.createTeam({
      ...parseResult.data,
      tenantId
    });

    const division = await storage.getDivision(team.divisionId, tenantId);

    res.status(201).json({
      ...team,
      divisionName: division?.name || "",
    });
  });

  app.patch("/api/teams/:id", requireAuth, requireTenant, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const tenantId = req.session!.tenantId!;

    const team = await storage.updateTeam(id, updates, tenantId);

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

  // Inventory API - require authentication and tenant isolation
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
    // Diagnostic: check what keys the schema expects
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
    const item = await storage.createInventoryItem({
      ...parseResult.data,
      tenantId
    });
    res.status(201).json(item);
  });

  app.patch("/api/inventory/:id", requireAuth, requireTenant, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const tenantId = req.session!.tenantId!;
    const item = await storage.updateInventoryItem(id, req.body, tenantId);

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
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items must be an array" });
    }

    const tenantId = req.session!.tenantId!;
    await storage.clearInventoryItems(tenantId);
    const createdItems = await storage.bulkCreateInventoryItems(items.map(i => ({ ...i, tenantId })));
    res.status(201).json(createdItems);
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

  // Outgoing Records API - require authentication and tenant isolation
  app.get("/api/outgoing", requireAuth, requireTenant, async (req, res) => {
    const tenantId = req.session!.tenantId!;
    const records = await storage.getOutgoingRecords(tenantId);
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
    const parseResult = apiInsertOutgoingRecordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.message });
    }

    const tenantId = req.session!.tenantId!;
    const record = await storage.createOutgoingRecord({
      ...parseResult.data,
      tenantId
    });

    await syncInventoryItem(
      parseResult.data.productName,
      parseResult.data.specification,
      parseResult.data.division,
      tenantId
    );

    res.status(201).json(record);
  });

  app.patch("/api/outgoing/:id", requireAuth, requireTenant, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const tenantId = req.session!.tenantId!;
    const oldRecord = await storage.getOutgoingRecord(id, tenantId);
    const record = await storage.updateOutgoingRecord(id, req.body, tenantId);

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

    // Get unique items to sync
    const itemsToSync = new Set(recordsToDelete.map(r => `${r.productName}|${r.specification}|${r.division}`));
    await Promise.all(Array.from(itemsToSync).map(async (itemKey) => {
      const [productName, specification, division] = itemKey.split('|');
      await syncInventoryItem(productName, specification, division, tenantId);
    }));

    res.json({ deletedCount });
  });

  app.get("/api/material-usage", requireAuth, requireTenant, async (req, res) => {
    const tenantId = req.session!.tenantId!;
    const records = await storage.getMaterialUsageRecords(tenantId);
    res.json(records);
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

  app.post("/api/material-usage", requireAuth, requireTenant, async (req, res) => {
    const parseResult = apiInsertMaterialUsageRecordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.message });
    }

    const tenantId = req.session!.tenantId!;
    const record = await storage.createMaterialUsageRecord({
      ...parseResult.data,
      tenantId
    });

    await syncInventoryItem(
      parseResult.data.productName,
      parseResult.data.specification,
      parseResult.data.division,
      tenantId
    );

    res.status(201).json(record);
  });

  app.patch("/api/material-usage/:id", requireAuth, requireTenant, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const tenantId = req.session!.tenantId!;
    const oldRecord = await storage.getMaterialUsageRecord(id, tenantId);
    const record = await storage.updateMaterialUsageRecord(id, req.body, tenantId);

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

  app.post("/api/material-usage/bulk-delete", requireAuth, requireTenant, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "IDs must be an array" });
    }

    const tenantId = req.session!.tenantId!;
    const records = await storage.getMaterialUsageRecords(tenantId);
    const recordsToDelete = records.filter(r => ids.includes(r.id));

    const deletedCount = await storage.bulkDeleteMaterialUsageRecords(ids, tenantId);

    // Get unique items to sync
    const itemsToSync = new Set(recordsToDelete.map(r => `${r.productName}|${r.specification}|${r.division}`));
    await Promise.all(Array.from(itemsToSync).map(async (itemKey) => {
      const [productName, specification, division] = itemKey.split('|');
      await syncInventoryItem(productName, specification, division, tenantId);
    }));

    res.json({ deletedCount });
  });

  // Incoming Records API - require authentication and tenant isolation
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
    const parseResult = apiInsertIncomingRecordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.message });
    }

    const tenantId = req.session!.tenantId!;
    const record = await storage.createIncomingRecord({
      ...parseResult.data,
      tenantId
    });

    // Ensure inventory item exists
    const inventoryItemsList = await storage.getInventoryItems(tenantId);
    const matchingItem = inventoryItemsList.find(
      item => item.productName === parseResult.data.productName &&
        item.specification === (parseResult.data.specification || "") &&
        item.division === parseResult.data.division
    );

    if (!matchingItem) {
      const unitPrice = parseResult.data.unitPrice ?? 0;
      await storage.createInventoryItem({
        tenantId,
        division: parseResult.data.division,
        category: parseResult.data.division,
        productName: parseResult.data.productName,
        specification: parseResult.data.specification ?? "",
        carriedOver: 0,
        incoming: 0,
        outgoing: 0,
        remaining: 0,
        unitPrice: unitPrice,
        totalAmount: 0,
      });
    }

    await syncInventoryItem(
      parseResult.data.productName,
      parseResult.data.specification || "",
      parseResult.data.division,
      tenantId
    );

    res.status(201).json(record);
  });

  app.patch("/api/incoming/:id", requireAuth, requireTenant, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const tenantId = req.session!.tenantId!;
    const oldRecord = await storage.getIncomingRecord(id, tenantId);
    const record = await storage.updateIncomingRecord(id, req.body, tenantId);

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

    // Get unique items to sync
    const itemsToSync = new Set(recordsToDelete.map(r => `${r.productName}|${r.specification || ""}|${r.division}`));
    await Promise.all(Array.from(itemsToSync).map(async (itemKey) => {
      const [productName, specification, division] = itemKey.split('|');
      await syncInventoryItem(productName, specification, division, tenantId);
    }));

    res.json({ deletedCount });
  });

  return httpServer;
}
