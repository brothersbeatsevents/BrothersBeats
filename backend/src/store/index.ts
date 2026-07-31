// ──────────────────────────────────────────
// Unified Async Store — delegates to in-memory (local) or DynamoDB (Lambda)
// ──────────────────────────────────────────

import * as dynamo from './dynamodb';
import { store as memoryStore } from './memory';

const USE_DYNAMO = !!process.env.USE_DYNAMODB;

// Map collection names to entity types for DynamoDB
const ENTITY_MAP: Record<string, dynamo.EntityType> = {
  users: 'USER',
  events: 'EVENT',
  ticketTiers: 'TICKET_TIER',
  bookings: 'BOOKING',
  tickets: 'TICKET',
  refunds: 'REFUND',
  subscribers: 'SUBSCRIBER',
  campaigns: 'CAMPAIGN',
  webhookEvents: 'WEBHOOK_EVENT',
  emailMessages: 'EMAIL_MESSAGE',
  mediaAssets: 'MEDIA_ASSET',
  auditLogs: 'AUDIT_LOG',
  emailSuppressions: 'EMAIL_SUPPRESSION',
  orgSettings: 'ORG_SETTINGS',
  galleryMedia: 'GALLERY_MEDIA',
  serviceEnquiries: 'EVENT_SERVICE_ENQUIRY',
};

type CollectionName = keyof typeof ENTITY_MAP;

function getMap(collection: CollectionName): Map<string, any> {
  return (memoryStore as any)[collection];
}

export const db = {
  /** Get a single item by ID */
  async get<T = any>(
    collection: CollectionName,
    id: string,
  ): Promise<T | null> {
    if (USE_DYNAMO) {
      return (await dynamo.getItem(ENTITY_MAP[collection], id)) as T | null;
    }
    return getMap(collection).get(id) ?? null;
  },

  /** Get all items in a collection */
  async getAll<T = any>(collection: CollectionName): Promise<T[]> {
    if (USE_DYNAMO) {
      return (await dynamo.getAll(ENTITY_MAP[collection])) as T[];
    }
    return memoryStore.getAll(getMap(collection));
  },

  /** Find one item by a field value */
  async findBy<T = any>(
    collection: CollectionName,
    field: string,
    value: unknown,
  ): Promise<T | undefined> {
    if (USE_DYNAMO) {
      return (await dynamo.findByField(
        ENTITY_MAP[collection],
        field,
        value,
      )) as T | undefined;
    }
    return memoryStore.findBy(getMap(collection), field, value);
  },

  /** Filter items by a field value */
  async filterBy<T = any>(
    collection: CollectionName,
    field: string,
    value: unknown,
  ): Promise<T[]> {
    if (USE_DYNAMO) {
      return (await dynamo.filterByField(
        ENTITY_MAP[collection],
        field,
        value,
      )) as T[];
    }
    return memoryStore.filterBy(getMap(collection), field, value);
  },

  /** Create or update an item */
  async put<T extends Record<string, any> = any>(
    collection: CollectionName,
    item: T,
  ): Promise<void> {
    if (USE_DYNAMO) {
      await dynamo.putItem(ENTITY_MAP[collection], item);
    } else {
      getMap(collection).set(item.id, item);
    }
  },

  /** Delete an item by ID */
  async delete(collection: CollectionName, id: string): Promise<void> {
    if (USE_DYNAMO) {
      await dynamo.deleteItem(ENTITY_MAP[collection], id);
    } else {
      getMap(collection).delete(id);
    }
  },

  /** Query by GSI2 (relationship queries — DynamoDB only, falls back to filterBy) */
  async queryRelated<T = any>(
    parentType: string,
    parentId: string,
    childPrefix?: string,
  ): Promise<T[]> {
    if (USE_DYNAMO) {
      return (await dynamo.queryByGSI2(
        `${parentType}#${parentId}`,
        childPrefix,
      )) as T[];
    }
    // Memory fallback: not applicable — callers use filterBy instead
    return [];
  },

  /** Atomic rate-limit counter (DynamoDB in Lambda, no-op count in memory) */
  async atomicRateLimitIncrement(
    key: string,
    windowMs: number,
  ): Promise<number> {
    if (USE_DYNAMO) {
      return dynamo.atomicRateLimitIncrement(key, windowMs);
    }
    // Memory fallback — handled in-memory by the caller (audit.ts)
    return 0;
  },

  // ── Inventory reservation guards (DynamoDB conditional updates; memory
  // falls back to a no-op since local dev uses optimistic read-checks) ──
  async reserveEventInventory(eventId: string, qty: number, capacity: number) {
    if (USE_DYNAMO) return dynamo.reserveEventInventory(eventId, qty, capacity);
  },
  async releaseEventInventory(eventId: string, qty: number) {
    if (USE_DYNAMO) return dynamo.releaseEventInventory(eventId, qty);
  },
  async confirmEventInventory(eventId: string, qty: number) {
    if (USE_DYNAMO) return dynamo.confirmEventInventory(eventId, qty);
  },
  async restoreEventInventoryOnRefund(eventId: string, qty: number) {
    if (USE_DYNAMO) return dynamo.restoreEventInventoryOnRefund(eventId, qty);
  },
  async reserveTierInventory(
    ticketTierId: string,
    qty: number,
    maxQuantity: number,
  ) {
    if (USE_DYNAMO)
      return dynamo.reserveTierInventory(ticketTierId, qty, maxQuantity);
  },
  async releaseTierInventory(ticketTierId: string, qty: number) {
    if (USE_DYNAMO) return dynamo.releaseTierInventory(ticketTierId, qty);
  },
  async confirmTierInventory(ticketTierId: string, qty: number) {
    if (USE_DYNAMO) return dynamo.confirmTierInventory(ticketTierId, qty);
  },
  async restoreTierInventoryOnRefund(ticketTierId: string, qty: number) {
    if (USE_DYNAMO)
      return dynamo.restoreTierInventoryOnRefund(ticketTierId, qty);
  },
};

// Re-export memory store for seed script
export { memoryStore as store };
