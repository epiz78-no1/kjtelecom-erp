import {
    type User, type InsertUser,
    type Division, type InsertDivision,
    type Team, type InsertTeam,
    type InventoryItem, type InsertInventoryItem,
    type OutgoingRecord, type InsertOutgoingRecord,
    type MaterialUsageRecord, type InsertMaterialUsageRecord,
    type IncomingRecord, type InsertIncomingRecord,
    type Position, type InsertPosition,
    type Invitation, type InsertInvitation,
    type UserTenant, type InsertUserTenant,
    type OpticalCable, type InsertOpticalCable,
    type OpticalCableLog, type InsertOpticalCableLog
} from "../../shared/schema.js";

export interface IStorage {
    // User & Auth
    getUser(id: string): Promise<User | undefined>;
    getUserByUsername(username: string): Promise<User | undefined>;
    createUser(user: InsertUser): Promise<User>;

    // Divisions
    getDivisions(tenantId: string): Promise<Division[]>;
    getDivision(id: string, tenantId: string): Promise<Division | undefined>;
    createDivision(name: string, tenantId: string): Promise<Division>;
    updateDivision(id: string, name: string, tenantId: string): Promise<Division | undefined>;
    deleteDivision(id: string, tenantId: string): Promise<boolean>;
    initializeDivisions(): Promise<void>;

    // Teams
    getTeams(tenantId: string): Promise<Team[]>;
    getTeamsByDivision(divisionId: string, tenantId: string): Promise<Team[]>;
    getTeam(id: string, tenantId: string): Promise<Team | undefined>;
    createTeam(team: InsertTeam, memberIds?: string[]): Promise<Team>;
    updateTeam(id: string, updates: Partial<InsertTeam>, tenantId: string, memberIds?: string[]): Promise<Team | undefined>;
    deleteTeam(id: string, tenantId: string): Promise<boolean>;
    initializeTeams(): Promise<void>;

    // Inventory
    getInventoryItems(tenantId: string): Promise<InventoryItem[]>;
    getInventoryItem(id: number, tenantId: string): Promise<InventoryItem | undefined>;
    createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
    updateInventoryItem(id: number, updates: Partial<InsertInventoryItem>, tenantId: string): Promise<InventoryItem | undefined>;
    deleteInventoryItem(id: number, tenantId: string): Promise<boolean>;
    bulkDeleteInventoryItems(ids: number[], tenantId: string): Promise<number>;
    clearInventoryItems(tenantId: string): Promise<void>;
    bulkCreateInventoryItems(items: InsertInventoryItem[]): Promise<InventoryItem[]>;
    syncInventoryItems(items: InsertInventoryItem[], tenantId: string, mode?: 'overwrite' | 'add'): Promise<InventoryItem[]>;

    // Incoming
    getIncomingRecords(tenantId: string): Promise<IncomingRecord[]>;
    getIncomingRecord(id: number, tenantId: string): Promise<IncomingRecord | undefined>;
    createIncomingRecord(record: InsertIncomingRecord): Promise<IncomingRecord>;
    updateIncomingRecord(id: number, updates: Partial<InsertIncomingRecord>, tenantId: string): Promise<IncomingRecord | undefined>;
    deleteIncomingRecord(id: number, tenantId: string): Promise<boolean>;
    bulkDeleteIncomingRecords(ids: number[], tenantId: string): Promise<number>;
    createIncomingRecordsBulk(records: InsertIncomingRecord[], tenantId: string): Promise<IncomingRecord[]>;

    // Outgoing
    getOutgoingRecords(tenantId: string): Promise<OutgoingRecord[]>;
    getOutgoingRecord(id: number, tenantId: string): Promise<OutgoingRecord | undefined>;
    createOutgoingRecord(record: InsertOutgoingRecord): Promise<OutgoingRecord>;
    updateOutgoingRecord(id: number, updates: Partial<InsertOutgoingRecord>, tenantId: string): Promise<OutgoingRecord | undefined>;
    deleteOutgoingRecord(id: number, tenantId: string): Promise<boolean>;
    bulkDeleteOutgoingRecords(ids: number[], tenantId: string): Promise<number>;
    clearOutgoingRecords(tenantId: string): Promise<void>;
    bulkCreateOutgoingRecords(records: InsertOutgoingRecord[]): Promise<OutgoingRecord[]>;
    initializeOutgoingRecords(): Promise<void>;

    // Material Usage
    getMaterialUsageRecords(tenantId: string): Promise<MaterialUsageRecord[]>;
    getMaterialUsageRecord(id: number, tenantId: string): Promise<MaterialUsageRecord | undefined>;
    createMaterialUsageRecord(record: InsertMaterialUsageRecord): Promise<MaterialUsageRecord>;
    updateMaterialUsageRecord(id: number, updates: Partial<InsertMaterialUsageRecord>, tenantId: string): Promise<MaterialUsageRecord | undefined>;
    getTeamItemStock(tenantId: string, teamCategory: string, inventoryItemId: number): Promise<number>;
    calculateInventoryStats(tenantId: string, productName: string, specification: string, division: string): Promise<{ totalIncoming: number; totalSentToTeam: number; totalUsage: number }>;
    deleteMaterialUsageRecord(id: number, tenantId: string): Promise<boolean>;
    bulkDeleteMaterialUsageRecords(ids: number[], tenantId: string): Promise<number>;

    // Admin: Positions
    getPositions(tenantId: string): Promise<Position[]>;
    getPosition(id: string, tenantId: string): Promise<Position | undefined>;
    createPosition(position: InsertPosition): Promise<Position>;
    updatePosition(id: string, updates: Partial<InsertPosition>, tenantId: string): Promise<Position | undefined>;
    deletePosition(id: string, tenantId: string): Promise<boolean>;

    // Admin: Members
    getMembers(tenantId: string): Promise<any[]>;
    updateMember(userId: string, tenantId: string, updates: Partial<InsertUserTenant> & { name?: string; phoneNumber?: string }): Promise<UserTenant | undefined>;
    deleteMember(userId: string, tenantId: string): Promise<boolean>;

    // Admin: Invitations
    getInvitations(tenantId: string): Promise<Invitation[]>;
    getInvitationByToken(token: string): Promise<Invitation | undefined>;
    createInvitation(invitation: InsertInvitation): Promise<Invitation>;
    updateInvitationStatus(id: string, status: string): Promise<void>;
    deleteInvitation(id: string, tenantId: string): Promise<boolean>;

    // Optical Cables
    getOpticalCables(tenantId: string): Promise<(OpticalCable & { logs: OpticalCableLog[] })[]>;
    getOpticalCable(id: string, tenantId: string): Promise<OpticalCable | undefined>;
    createOpticalCable(cable: InsertOpticalCable, tenantId: string): Promise<OpticalCable>;
    updateOpticalCable(id: string, updates: Partial<InsertOpticalCable>, tenantId: string): Promise<OpticalCable | undefined>;
    createOpticalCablesBulk(cables: InsertOpticalCable[], tenantId: string): Promise<OpticalCable[]>;
    bulkDeleteOpticalCables(ids: string[], tenantId: string): Promise<void>;

    // Optical Cable Logs
    createOpticalCableLog(log: InsertOpticalCableLog, tenantId: string): Promise<OpticalCable>;
    getOpticalCableLogs(cableId: string, tenantId: string): Promise<OpticalCableLog[]>;
    getAllOpticalCableLogs(tenantId: string): Promise<(OpticalCableLog & { cable: OpticalCable | null })[]>;
    getOpticalCableLog(id: string, tenantId: string): Promise<OpticalCableLog | undefined>;
    updateOpticalCableLog(id: string, updates: Partial<InsertOpticalCableLog>, tenantId: string): Promise<OpticalCableLog | undefined>;
    deleteOpticalCableLog(id: string, tenantId: string): Promise<boolean>;
    bulkDeleteOpticalCableLogs(ids: string[], tenantId: string): Promise<void>;
}
