import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTeamSchema, insertInventoryItemSchema, insertOutgoingRecordSchema, insertMaterialUsageRecordSchema, insertIncomingRecordSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // await storage.initializeDivisions();
  // await storage.initializeTeams();
  // await storage.initializeOutgoingRecords();
  console.log("Server routes initialized");

  app.get("/api/divisions", async (req, res) => {
    const divisions = await storage.getDivisions();
    res.json(divisions);
  });

  app.post("/api/divisions", async (req, res) => {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Name is required" });
    }

    const division = await storage.createDivision(name);
    res.status(201).json(division);
  });

  app.patch("/api/divisions/:id", async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Name is required" });
    }

    const division = await storage.updateDivision(id, name);
    if (!division) {
      return res.status(404).json({ error: "Division not found" });
    }
    res.json(division);
  });

  app.delete("/api/divisions/:id", async (req, res) => {
    const { id } = req.params;
    const success = await storage.deleteDivision(id);

    if (!success) {
      return res.status(404).json({ error: "Division not found" });
    }
    res.status(204).send();
  });

  app.get("/api/teams", async (req, res) => {
    const { divisionId } = req.query;
    let teamList;

    if (divisionId && typeof divisionId === "string") {
      teamList = await storage.getTeamsByDivision(divisionId);
    } else {
      teamList = await storage.getTeams();
    }

    const divisions = await storage.getDivisions();
    const divisionMap = new Map(divisions.map(d => [d.id, d.name]));

    const teamsWithDivisionName = teamList.map(team => ({
      ...team,
      divisionName: divisionMap.get(team.divisionId) || "",
    }));

    res.json(teamsWithDivisionName);
  });

  app.post("/api/teams", async (req, res) => {
    const parseResult = insertTeamSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.message });
    }

    const team = await storage.createTeam(parseResult.data);
    const division = await storage.getDivision(team.divisionId);

    res.status(201).json({
      ...team,
      divisionName: division?.name || "",
    });
  });

  app.patch("/api/teams/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const team = await storage.updateTeam(id, updates);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const division = await storage.getDivision(team.divisionId);
    res.json({
      ...team,
      divisionName: division?.name || "",
    });
  });

  app.delete("/api/teams/:id", async (req, res) => {
    const { id } = req.params;
    const success = await storage.deleteTeam(id);

    if (!success) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.status(204).send();
  });

  app.get("/api/inventory", async (req, res) => {
    const items = await storage.getInventoryItems();
    res.json(items);
  });

  app.get("/api/inventory/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const item = await storage.getInventoryItem(id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json(item);
  });

  app.post("/api/inventory", async (req, res) => {
    const parseResult = insertInventoryItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.message });
    }

    const item = await storage.createInventoryItem(parseResult.data);
    res.status(201).json(item);
  });

  app.patch("/api/inventory/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const item = await storage.updateInventoryItem(id, req.body);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json(item);
  });

  app.delete("/api/inventory/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const success = await storage.deleteInventoryItem(id);
    if (!success) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.status(204).send();
  });

  app.post("/api/inventory/bulk", async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items must be an array" });
    }

    await storage.clearInventoryItems();
    const createdItems = await storage.bulkCreateInventoryItems(items);
    res.status(201).json(createdItems);
  });

  app.post("/api/inventory/bulk-delete", async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "IDs must be an array" });
    }

    const deletedCount = await storage.bulkDeleteInventoryItems(ids);
    res.json({ deletedCount });
  });

  app.get("/api/outgoing", async (req, res) => {
    const records = await storage.getOutgoingRecords();
    res.json(records);
  });

  app.get("/api/outgoing/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const record = await storage.getOutgoingRecord(id);
    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.json(record);
  });

  app.post("/api/outgoing", async (req, res) => {
    const parseResult = insertOutgoingRecordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.message });
    }

    const record = await storage.createOutgoingRecord(parseResult.data);
    res.status(201).json(record);
  });

  app.patch("/api/outgoing/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const record = await storage.updateOutgoingRecord(id, req.body);
    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.json(record);
  });

  app.delete("/api/outgoing/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const success = await storage.deleteOutgoingRecord(id);
    if (!success) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.status(204).send();
  });

  app.post("/api/outgoing/bulk-delete", async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "IDs must be an array" });
    }

    const deletedCount = await storage.bulkDeleteOutgoingRecords(ids);
    res.json({ deletedCount });
  });

  app.get("/api/material-usage", async (req, res) => {
    const records = await storage.getMaterialUsageRecords();
    res.json(records);
  });

  app.get("/api/material-usage/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const record = await storage.getMaterialUsageRecord(id);
    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.json(record);
  });

  app.post("/api/material-usage", async (req, res) => {
    const parseResult = insertMaterialUsageRecordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.message });
    }

    const record = await storage.createMaterialUsageRecord(parseResult.data);
    res.status(201).json(record);
  });

  app.patch("/api/material-usage/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const record = await storage.updateMaterialUsageRecord(id, req.body);
    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.json(record);
  });

  app.delete("/api/material-usage/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const success = await storage.deleteMaterialUsageRecord(id);
    if (!success) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.status(204).send();
  });

  app.post("/api/material-usage/bulk-delete", async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "IDs must be an array" });
    }

    const deletedCount = await storage.bulkDeleteMaterialUsageRecords(ids);
    res.json({ deletedCount });
  });

  app.get("/api/incoming", async (req, res) => {
    const records = await storage.getIncomingRecords();
    res.json(records);
  });

  app.get("/api/incoming/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const record = await storage.getIncomingRecord(id);
    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.json(record);
  });

  app.post("/api/incoming", async (req, res) => {
    const parseResult = insertIncomingRecordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.message });
    }

    const record = await storage.createIncomingRecord(parseResult.data);

    // Update inventory: find matching item and increase incoming/remaining
    const inventoryItems = await storage.getInventoryItems();
    const matchingItem = inventoryItems.find(
      item => item.productName === parseResult.data.productName &&
        item.specification === parseResult.data.specification &&
        item.division === parseResult.data.division
    );

    const quantity = parseResult.data.quantity ?? 0;

    if (matchingItem) {
      const newIncoming = matchingItem.incoming + quantity;
      const newRemaining = matchingItem.carriedOver + newIncoming - matchingItem.outgoing;
      const newTotalAmount = newRemaining * matchingItem.unitPrice;
      await storage.updateInventoryItem(matchingItem.id, {
        incoming: newIncoming,
        remaining: newRemaining,
        totalAmount: newTotalAmount,
      });
    } else {
      // Create new inventory item if it doesn't exist
      const unitPrice = parseResult.data.unitPrice ?? 0;
      await storage.createInventoryItem({
        division: parseResult.data.division,
        category: parseResult.data.division, // Use division as category for new items
        productName: parseResult.data.productName,
        specification: parseResult.data.specification ?? "",
        carriedOver: 0,
        incoming: quantity,
        outgoing: 0,
        remaining: quantity,
        unitPrice: unitPrice,
        totalAmount: quantity * unitPrice,
      });
    }

    res.status(201).json(record);
  });

  app.patch("/api/incoming/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const record = await storage.updateIncomingRecord(id, req.body);
    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.json(record);
  });

  app.delete("/api/incoming/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const success = await storage.deleteIncomingRecord(id);
    if (!success) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.status(204).send();
  });

  app.post("/api/incoming/bulk-delete", async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "IDs must be an array" });
    }

    const deletedCount = await storage.bulkDeleteIncomingRecords(ids);
    res.json({ deletedCount });
  });

  return httpServer;
}
