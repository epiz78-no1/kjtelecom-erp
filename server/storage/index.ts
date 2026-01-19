import { IStorage } from "./interface.js";
import { UserStorage } from "./user.js";
import { InventoryStorage } from "./inventory.js";
import { OpticalStorage } from "./optical.js";
import { TeamStorage } from "./teams.js";
import { DemolitionStorage } from "./demolition.js";

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
    getUser!: UserStorage['getUser'];
    getUserByUsername!: UserStorage['getUserByUsername'];
    createUser!: UserStorage['createUser'];
    getInvitations!: UserStorage['getInvitations'];
    getInvitationByToken!: UserStorage['getInvitationByToken'];
    createInvitation!: UserStorage['createInvitation'];
    updateInvitationStatus!: UserStorage['updateInvitationStatus'];
    deleteInvitation!: UserStorage['deleteInvitation'];
    getMembers!: UserStorage['getMembers'];
    updateMember!: UserStorage['updateMember'];
    deleteMember!: UserStorage['deleteMember'];

    getInventoryItems!: InventoryStorage['getInventoryItems'];
    getInventoryItem!: InventoryStorage['getInventoryItem'];
    createInventoryItem!: InventoryStorage['createInventoryItem'];
    updateInventoryItem!: InventoryStorage['updateInventoryItem'];
    deleteInventoryItem!: InventoryStorage['deleteInventoryItem'];
    bulkDeleteInventoryItems!: InventoryStorage['bulkDeleteInventoryItems'];
    clearInventoryItems!: InventoryStorage['clearInventoryItems'];
    bulkCreateInventoryItems!: InventoryStorage['bulkCreateInventoryItems'];
    syncInventoryItems!: InventoryStorage['syncInventoryItems'];
    getIncomingRecords!: InventoryStorage['getIncomingRecords'];
    getIncomingRecord!: InventoryStorage['getIncomingRecord'];
    createIncomingRecord!: InventoryStorage['createIncomingRecord'];
    updateIncomingRecord!: InventoryStorage['updateIncomingRecord'];
    deleteIncomingRecord!: InventoryStorage['deleteIncomingRecord'];
    bulkDeleteIncomingRecords!: InventoryStorage['bulkDeleteIncomingRecords'];
    createIncomingRecordsBulk!: InventoryStorage['createIncomingRecordsBulk'];
    getOutgoingRecords!: InventoryStorage['getOutgoingRecords'];
    getOutgoingRecord!: InventoryStorage['getOutgoingRecord'];
    createOutgoingRecord!: InventoryStorage['createOutgoingRecord'];
    updateOutgoingRecord!: InventoryStorage['updateOutgoingRecord'];
    deleteOutgoingRecord!: InventoryStorage['deleteOutgoingRecord'];
    bulkDeleteOutgoingRecords!: InventoryStorage['bulkDeleteOutgoingRecords'];
    clearOutgoingRecords!: InventoryStorage['clearOutgoingRecords'];
    bulkCreateOutgoingRecords!: InventoryStorage['bulkCreateOutgoingRecords'];
    initializeOutgoingRecords!: InventoryStorage['initializeOutgoingRecords'];
    getMaterialUsageRecords!: InventoryStorage['getMaterialUsageRecords'];
    getMaterialUsageRecord!: InventoryStorage['getMaterialUsageRecord'];
    createMaterialUsageRecord!: InventoryStorage['createMaterialUsageRecord'];
    updateMaterialUsageRecord!: InventoryStorage['updateMaterialUsageRecord'];
    deleteMaterialUsageRecord!: InventoryStorage['deleteMaterialUsageRecord'];
    bulkDeleteMaterialUsageRecords!: InventoryStorage['bulkDeleteMaterialUsageRecords'];
    getTeamItemStock!: InventoryStorage['getTeamItemStock'];
    calculateInventoryStats!: InventoryStorage['calculateInventoryStats'];

    getOpticalCables!: OpticalStorage['getOpticalCables'];
    getOpticalCable!: OpticalStorage['getOpticalCable'];
    createOpticalCable!: OpticalStorage['createOpticalCable'];
    updateOpticalCable!: OpticalStorage['updateOpticalCable'];
    createOpticalCablesBulk!: OpticalStorage['createOpticalCablesBulk'];
    bulkDeleteOpticalCables!: OpticalStorage['bulkDeleteOpticalCables'];
    getOpticalCableLogs!: OpticalStorage['getOpticalCableLogs'];
    getAllOpticalCableLogs!: OpticalStorage['getAllOpticalCableLogs'];
    getOpticalCableLog!: OpticalStorage['getOpticalCableLog'];
    updateOpticalCableLog!: OpticalStorage['updateOpticalCableLog'];
    createOpticalCableLog!: OpticalStorage['createOpticalCableLog'];
    deleteOpticalCableLog!: OpticalStorage['deleteOpticalCableLog'];
    bulkDeleteOpticalCableLogs!: OpticalStorage['bulkDeleteOpticalCableLogs'];
    updateCableReservation!: OpticalStorage['updateCableReservation'];
    bulkAssignOpticalCables!: OpticalStorage['bulkAssignOpticalCables'];

    getDivisions!: TeamStorage['getDivisions'];
    getDivision!: TeamStorage['getDivision'];
    createDivision!: TeamStorage['createDivision'];
    updateDivision!: TeamStorage['updateDivision'];
    deleteDivision!: TeamStorage['deleteDivision'];
    initializeDivisions!: TeamStorage['initializeDivisions'];
    getTeams!: TeamStorage['getTeams'];
    getTeamsByDivision!: TeamStorage['getTeamsByDivision'];
    getTeam!: TeamStorage['getTeam'];
    createTeam!: TeamStorage['createTeam'];
    updateTeam!: TeamStorage['updateTeam'];
    deleteTeam!: TeamStorage['deleteTeam'];
    initializeTeams!: TeamStorage['initializeTeams'];
    getPositions!: TeamStorage['getPositions'];
    getPosition!: TeamStorage['getPosition'];
    createPosition!: TeamStorage['createPosition'];
    updatePosition!: TeamStorage['updatePosition'];
    deletePosition!: TeamStorage['deletePosition'];

    // Demolition
    generateDemolitionManagementNo!: DemolitionStorage['generateDemolitionManagementNo'];
    getDemolitionMaterials!: DemolitionStorage['getDemolitionMaterials'];
    getDemolitionMaterial!: DemolitionStorage['getDemolitionMaterial'];
    createDemolitionMaterial!: DemolitionStorage['createDemolitionMaterial'];
    updateDemolitionMaterial!: DemolitionStorage['updateDemolitionMaterial'];
    createDemolitionMaterialLog!: DemolitionStorage['createDemolitionMaterialLog'];
    getDemolitionMaterialLogs!: DemolitionStorage['getDemolitionMaterialLogs'];
    getAllDemolitionMaterialLogs!: DemolitionStorage['getAllDemolitionMaterialLogs'];
    getDemolitionMaterialLog!: DemolitionStorage['getDemolitionMaterialLog'];
    updateDemolitionMaterialLog!: DemolitionStorage['updateDemolitionMaterialLog'];
    deleteDemolitionMaterialLog!: DemolitionStorage['deleteDemolitionMaterialLog'];
    bulkDeleteDemolitionMaterialLogs!: DemolitionStorage['bulkDeleteDemolitionMaterialLogs'];
    getDemolitionDashboard!: DemolitionStorage['getDemolitionDashboard'];
}

applyMixins(DatabaseStorage, [UserStorage, InventoryStorage, OpticalStorage, TeamStorage, DemolitionStorage]);

export const storage = new DatabaseStorage();
