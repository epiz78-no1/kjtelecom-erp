import { IStorage } from "./storage/interface.js";
import { UserStorage } from "./storage/user.js";
import { InventoryStorage } from "./storage/inventory.js";
import { OpticalStorage } from "./storage/optical.js";
import { TeamStorage } from "./storage/teams.js";

// Utility type to merge classes
function applyMixins(derivedCtor: any, constructors: any[]) {
    constructors.forEach((baseCtor) => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
            Object.defineProperty(
                derivedCtor.prototype,
                name,
                Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
                Object.create(null)
            );
        });
    });
}

class DatabaseStorage implements IStorage {
    // These will be mixed in
    declare getUser: UserStorage['getUser'];
    declare getUserByUsername: UserStorage['getUserByUsername'];
    declare createUser: UserStorage['createUser'];
    declare getInvitations: UserStorage['getInvitations'];
    declare getInvitationByToken: UserStorage['getInvitationByToken'];
    declare createInvitation: UserStorage['createInvitation'];
    declare updateInvitationStatus: UserStorage['updateInvitationStatus'];
    declare deleteInvitation: UserStorage['deleteInvitation'];
    declare getMembers: UserStorage['getMembers'];
    declare updateMember: UserStorage['updateMember'];
    declare deleteMember: UserStorage['deleteMember'];

    declare getInventoryItems: InventoryStorage['getInventoryItems'];
    declare getInventoryItem: InventoryStorage['getInventoryItem'];
    declare createInventoryItem: InventoryStorage['createInventoryItem'];
    declare updateInventoryItem: InventoryStorage['updateInventoryItem'];
    declare deleteInventoryItem: InventoryStorage['deleteInventoryItem'];
    declare bulkDeleteInventoryItems: InventoryStorage['bulkDeleteInventoryItems'];
    declare clearInventoryItems: InventoryStorage['clearInventoryItems'];
    declare bulkCreateInventoryItems: InventoryStorage['bulkCreateInventoryItems'];
    declare syncInventoryItems: InventoryStorage['syncInventoryItems'];
    declare getIncomingRecords: InventoryStorage['getIncomingRecords'];
    declare getIncomingRecord: InventoryStorage['getIncomingRecord'];
    declare createIncomingRecord: InventoryStorage['createIncomingRecord'];
    declare updateIncomingRecord: InventoryStorage['updateIncomingRecord'];
    declare deleteIncomingRecord: InventoryStorage['deleteIncomingRecord'];
    declare bulkDeleteIncomingRecords: InventoryStorage['bulkDeleteIncomingRecords'];
    declare createIncomingRecordsBulk: InventoryStorage['createIncomingRecordsBulk'];
    declare getOutgoingRecords: InventoryStorage['getOutgoingRecords'];
    declare getOutgoingRecord: InventoryStorage['getOutgoingRecord'];
    declare createOutgoingRecord: InventoryStorage['createOutgoingRecord'];
    declare updateOutgoingRecord: InventoryStorage['updateOutgoingRecord'];
    declare deleteOutgoingRecord: InventoryStorage['deleteOutgoingRecord'];
    declare bulkDeleteOutgoingRecords: InventoryStorage['bulkDeleteOutgoingRecords'];
    declare clearOutgoingRecords: InventoryStorage['clearOutgoingRecords'];
    declare bulkCreateOutgoingRecords: InventoryStorage['bulkCreateOutgoingRecords'];
    declare initializeOutgoingRecords: InventoryStorage['initializeOutgoingRecords'];
    declare getMaterialUsageRecords: InventoryStorage['getMaterialUsageRecords'];
    declare getMaterialUsageRecord: InventoryStorage['getMaterialUsageRecord'];
    declare createMaterialUsageRecord: InventoryStorage['createMaterialUsageRecord'];
    declare updateMaterialUsageRecord: InventoryStorage['updateMaterialUsageRecord'];
    declare deleteMaterialUsageRecord: InventoryStorage['deleteMaterialUsageRecord'];
    declare bulkDeleteMaterialUsageRecords: InventoryStorage['bulkDeleteMaterialUsageRecords'];
    declare getTeamItemStock: InventoryStorage['getTeamItemStock'];
    declare calculateInventoryStats: InventoryStorage['calculateInventoryStats'];

    declare getOpticalCables: OpticalStorage['getOpticalCables'];
    declare getOpticalCable: OpticalStorage['getOpticalCable'];
    declare createOpticalCable: OpticalStorage['createOpticalCable'];
    declare updateOpticalCable: OpticalStorage['updateOpticalCable'];
    declare createOpticalCablesBulk: OpticalStorage['createOpticalCablesBulk'];
    declare bulkDeleteOpticalCables: OpticalStorage['bulkDeleteOpticalCables'];
    declare getOpticalCableLogs: OpticalStorage['getOpticalCableLogs'];
    declare getAllOpticalCableLogs: OpticalStorage['getAllOpticalCableLogs'];
    declare getOpticalCableLog: OpticalStorage['getOpticalCableLog'];
    declare updateOpticalCableLog: OpticalStorage['updateOpticalCableLog'];
    declare createOpticalCableLog: OpticalStorage['createOpticalCableLog'];
    declare deleteOpticalCableLog: OpticalStorage['deleteOpticalCableLog'];
    declare bulkDeleteOpticalCableLogs: OpticalStorage['bulkDeleteOpticalCableLogs'];
    declare updateCableReservation: OpticalStorage['updateCableReservation'];

    declare getDivisions: TeamStorage['getDivisions'];
    declare getDivision: TeamStorage['getDivision'];
    declare createDivision: TeamStorage['createDivision'];
    declare updateDivision: TeamStorage['updateDivision'];
    declare deleteDivision: TeamStorage['deleteDivision'];
    declare initializeDivisions: TeamStorage['initializeDivisions'];
    declare getTeams: TeamStorage['getTeams'];
    declare getTeamsByDivision: TeamStorage['getTeamsByDivision'];
    declare getTeam: TeamStorage['getTeam'];
    declare createTeam: TeamStorage['createTeam'];
    declare updateTeam: TeamStorage['updateTeam'];
    declare deleteTeam: TeamStorage['deleteTeam'];
    declare initializeTeams: TeamStorage['initializeTeams'];
    declare getPositions: TeamStorage['getPositions'];
    declare getPosition: TeamStorage['getPosition'];
    declare createPosition: TeamStorage['createPosition'];
    declare updatePosition: TeamStorage['updatePosition'];
    declare deletePosition: TeamStorage['deletePosition'];
}

applyMixins(DatabaseStorage, [UserStorage, InventoryStorage, OpticalStorage, TeamStorage]);

export const storage = new DatabaseStorage();
