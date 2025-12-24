import { db } from "../db";
import { eq, and } from "drizzle-orm";
import {
    inventoryItems,
    incomingRecords,
    outgoingRecords,
    materialUsageRecords,
    teams,
    divisions
} from "@shared/schema";

/**
 * Scoped query helper for tenant-isolated data access
 * Automatically filters all queries by tenantId
 */
export function scopedQuery(tenantId: string) {
    return {
        /**
         * Inventory items scoped to tenant
         */
        inventoryItems: {
            findMany: async () => {
                return db.query.inventoryItems.findMany({
                    where: eq(inventoryItems.tenantId, tenantId)
                });
            },

            findFirst: async () => {
                return db.query.inventoryItems.findFirst({
                    where: eq(inventoryItems.tenantId, tenantId)
                });
            }
        },

        /**
         * Incoming records scoped to tenant
         */
        incomingRecords: {
            findMany: async () => {
                return db.query.incomingRecords.findMany({
                    where: eq(incomingRecords.tenantId, tenantId)
                });
            }
        },

        /**
         * Outgoing records scoped to tenant
         */
        outgoingRecords: {
            findMany: async () => {
                return db.query.outgoingRecords.findMany({
                    where: eq(outgoingRecords.tenantId, tenantId)
                });
            }
        },

        /**
         * Material usage records scoped to tenant
         */
        materialUsageRecords: {
            findMany: async () => {
                return db.query.materialUsageRecords.findMany({
                    where: eq(materialUsageRecords.tenantId, tenantId)
                });
            }
        },

        /**
         * Teams scoped to tenant
         */
        teams: {
            findMany: async () => {
                return db.query.teams.findMany({
                    where: eq(teams.tenantId, tenantId)
                });
            }
        },

        /**
         * Divisions scoped to tenant
         */
        divisions: {
            findMany: async () => {
                return db.query.divisions.findMany({
                    where: eq(divisions.tenantId, tenantId)
                });
            }
        }
    };
}

/**
 * Helper to ensure tenantId is included in insert/update operations
 */
export function withTenantId<T extends Record<string, any>>(
    data: T,
    tenantId: string
): T & { tenantId: string } {
    return {
        ...data,
        tenantId
    };
}
