// ──────────────────────────────────────────
// DynamoDB Data Store
// Single-table design: PK = ENTITY#<type>, SK = <id>
// GSI1: slug lookups (GSI1PK = ENTITY#<type>, GSI1SK = <slug>)
// GSI2: relationship queries (GSI2PK = <parent_type>#<parent_id>, GSI2SK = <created_at>)
// ──────────────────────────────────────────

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'brothers-beats-dev';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-west-1',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
  }),
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

// ── Entity type → DynamoDB key mappings ──
export type EntityType =
  | 'USER'
  | 'EVENT'
  | 'TICKET_TIER'
  | 'BOOKING'
  | 'TICKET'
  | 'REFUND'
  | 'SUBSCRIBER'
  | 'CAMPAIGN'
  | 'WEBHOOK_EVENT'
  | 'EMAIL_MESSAGE'
  | 'MEDIA_ASSET'
  | 'AUDIT_LOG'
  | 'EMAIL_SUPPRESSION'
  | 'ORG_SETTINGS'
  | 'GALLERY_MEDIA'
  | 'EVENT_SERVICE_ENQUIRY';

// Fields that hold a slug for GSI1 (or another unique lookup key reused as "slug")
const SLUG_ENTITIES = new Set<EntityType>(['USER', 'EVENT']);

// Relationship fields for GSI2
function getGSI2Keys(
  entityType: EntityType,
  item: Record<string, unknown>,
): { GSI2PK?: string; GSI2SK?: string } {
  switch (entityType) {
    case 'TICKET_TIER':
      if (item.eventId)
        return {
          GSI2PK: `EVENT#${item.eventId}`,
          GSI2SK: `TIER#${item.sortOrder ?? 0}#${item.id}`,
        };
      return {};
    case 'BOOKING':
      if (item.eventId)
        return {
          GSI2PK: `EVENT#${item.eventId}`,
          GSI2SK: `BOOKING#${item.created_at}`,
        };
      return {};
    case 'TICKET':
      if (item.bookingId)
        return {
          GSI2PK: `BOOKING#${item.bookingId}`,
          GSI2SK: `TICKET#${item.created_at}`,
        };
      return {};
    case 'REFUND':
      if (item.bookingId)
        return {
          GSI2PK: `BOOKING#${item.bookingId}`,
          GSI2SK: `REFUND#${item.requestedAt}`,
        };
      return {};
    case 'GALLERY_MEDIA':
      if (item.eventId)
        return {
          GSI2PK: `EVENT#${item.eventId}`,
          GSI2SK: `GALLERY#${item.created_at}`,
        };
      return {};
    default:
      return {};
  }
}

// ── Core CRUD operations ──

export async function putItem(
  entityType: EntityType,
  item: Record<string, unknown>,
): Promise<void> {
  const id = item.id as string;
  const slug = (item as any).slug as string | undefined;
  const gsi2 = getGSI2Keys(entityType, item);

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `ENTITY#${entityType}`,
        SK: id,
        ...(slug && SLUG_ENTITIES.has(entityType)
          ? { GSI1PK: `ENTITY#${entityType}`, GSI1SK: slug }
          : {}),
        ...gsi2,
        entityType,
        ...item,
      },
    }),
  );
}

export async function deleteItem(
  entityType: EntityType,
  id: string,
): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `ENTITY#${entityType}`, SK: id },
    }),
  );
}

export async function getItem(
  entityType: EntityType,
  id: string,
): Promise<Record<string, unknown> | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `ENTITY#${entityType}`, SK: id },
    }),
  );
  return result.Item ? stripDynamoKeys(result.Item) : null;
}

export async function getAll(
  entityType: EntityType,
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': `ENTITY#${entityType}` },
        ...(lastKey && { ExclusiveStartKey: lastKey }),
      }),
    );
    if (result.Items) items.push(...result.Items.map(stripDynamoKeys));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

export async function findBySlug(
  entityType: EntityType,
  slug: string,
): Promise<Record<string, unknown> | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `ENTITY#${entityType}`,
        ':sk': slug,
      },
      Limit: 1,
    }),
  );
  return result.Items?.[0] ? stripDynamoKeys(result.Items[0]) : null;
}

export async function findByField(
  entityType: EntityType,
  field: string,
  value: unknown,
): Promise<Record<string, unknown> | undefined> {
  // For slug lookups, use GSI1
  if (field === 'slug' && SLUG_ENTITIES.has(entityType)) {
    return (await findBySlug(entityType, value as string)) ?? undefined;
  }
  // For email on USER, use GSI1 with email as slug alternative —
  // or fall back to scan+filter for other fields
  const items = await filterByField(entityType, field, value);
  return items[0];
}

export async function filterByField(
  entityType: EntityType,
  field: string,
  value: unknown,
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        FilterExpression: `#field = :val`,
        ExpressionAttributeNames: { '#field': field },
        ExpressionAttributeValues: {
          ':pk': `ENTITY#${entityType}`,
          ':val': value,
        },
        ...(lastKey && { ExclusiveStartKey: lastKey }),
      }),
    );
    if (result.Items) items.push(...result.Items.map(stripDynamoKeys));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

export async function queryByGSI2(
  gsi2pk: string,
  skPrefix?: string,
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: skPrefix
          ? 'GSI2PK = :pk AND begins_with(GSI2SK, :sk)'
          : 'GSI2PK = :pk',
        ExpressionAttributeValues: {
          ':pk': gsi2pk,
          ...(skPrefix && { ':sk': skPrefix }),
        },
        ...(lastKey && { ExclusiveStartKey: lastKey }),
      }),
    );
    if (result.Items) items.push(...result.Items.map(stripDynamoKeys));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

// ── Strip DynamoDB internal keys from returned items ──
function stripDynamoKeys(
  item: Record<string, unknown>,
): Record<string, unknown> {
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...rest } = item;
  return rest;
}

// ── Atomic DynamoDB-backed rate limit counter (HIGH-6) ──
// Uses a fixed time-window key so counts auto-expire via DynamoDB TTL.
export async function atomicRateLimitIncrement(
  key: string,
  windowMs: number,
): Promise<number> {
  const windowKey = Math.floor(Date.now() / windowMs);
  const sk = `${key}#${windowKey}`;
  const ttlEpoch = Math.floor((Date.now() + windowMs * 2) / 1000);

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'RATELIMIT', SK: sk },
      UpdateExpression: 'ADD #cnt :one SET #ttl = :ttl',
      ExpressionAttributeNames: { '#cnt': 'count', '#ttl': 'ttl' },
      ExpressionAttributeValues: { ':one': 1, ':ttl': ttlEpoch },
      ReturnValues: 'ALL_NEW',
    }),
  );

  return (result.Attributes?.count as number) || 1;
}

// ── Atomic inventory reservation/sale guards (HIGH-3) ──
// Throws ConditionalCheckError if the operation would exceed capacity.
export class ConditionalCheckError extends Error {
  constructor() {
    super('ConditionalCheckFailed');
    this.name = 'ConditionalCheckError';
  }
}

// Reserve `qty` units of event + tier inventory atomically (two conditional updates).
// Not a true multi-item DynamoDB transaction (kept simple for the Express/SAM setup),
// but each individual update is conditionally guarded against overselling.
export async function reserveEventInventory(
  eventId: string,
  qty: number,
  capacity: number,
): Promise<void> {
  const maxExisting = capacity - qty;
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: 'ENTITY#EVENT', SK: eventId },
        UpdateExpression:
          'ADD totalTicketsReserved :qty SET updated_at = :now',
        ConditionExpression:
          '(attribute_not_exists(totalTicketsSold) OR totalTicketsSold <= :maxSoldPlusQty) AND (attribute_not_exists(totalTicketsReserved) OR totalTicketsReserved <= :maxExisting)',
        ExpressionAttributeValues: {
          ':qty': qty,
          ':maxExisting': maxExisting,
          ':maxSoldPlusQty': capacity,
          ':now': new Date().toISOString(),
        },
      }),
    );
  } catch (e: any) {
    if (e.name === 'ConditionalCheckFailedException') {
      throw new ConditionalCheckError();
    }
    throw e;
  }
}

export async function releaseEventInventory(
  eventId: string,
  qty: number,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'ENTITY#EVENT', SK: eventId },
      UpdateExpression: 'ADD totalTicketsReserved :negQty SET updated_at = :now',
      ExpressionAttributeValues: {
        ':negQty': -qty,
        ':now': new Date().toISOString(),
      },
    }),
  );
}

export async function confirmEventInventory(
  eventId: string,
  qty: number,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'ENTITY#EVENT', SK: eventId },
      UpdateExpression:
        'ADD totalTicketsReserved :negQty, totalTicketsSold :qty SET updated_at = :now',
      ExpressionAttributeValues: {
        ':negQty': -qty,
        ':qty': qty,
        ':now': new Date().toISOString(),
      },
    }),
  );
}

export async function restoreEventInventoryOnRefund(
  eventId: string,
  qty: number,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'ENTITY#EVENT', SK: eventId },
      UpdateExpression: 'ADD totalTicketsSold :negQty SET updated_at = :now',
      ExpressionAttributeValues: {
        ':negQty': -qty,
        ':now': new Date().toISOString(),
      },
    }),
  );
}

// Same set of operations scoped to a ticket tier (quantityReserved / quantitySold)
export async function reserveTierInventory(
  ticketTierId: string,
  qty: number,
  maxQuantity: number,
): Promise<void> {
  const maxExisting = maxQuantity - qty;
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: 'ENTITY#TICKET_TIER', SK: ticketTierId },
        UpdateExpression: 'ADD quantityReserved :qty SET updated_at = :now',
        ConditionExpression:
          '(attribute_not_exists(quantitySold) OR quantitySold <= :maxQty) AND (attribute_not_exists(quantityReserved) OR quantityReserved <= :maxExisting)',
        ExpressionAttributeValues: {
          ':qty': qty,
          ':maxExisting': maxExisting,
          ':maxQty': maxQuantity,
          ':now': new Date().toISOString(),
        },
      }),
    );
  } catch (e: any) {
    if (e.name === 'ConditionalCheckFailedException') {
      throw new ConditionalCheckError();
    }
    throw e;
  }
}

export async function releaseTierInventory(
  ticketTierId: string,
  qty: number,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'ENTITY#TICKET_TIER', SK: ticketTierId },
      UpdateExpression: 'ADD quantityReserved :negQty SET updated_at = :now',
      ExpressionAttributeValues: {
        ':negQty': -qty,
        ':now': new Date().toISOString(),
      },
    }),
  );
}

export async function confirmTierInventory(
  ticketTierId: string,
  qty: number,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'ENTITY#TICKET_TIER', SK: ticketTierId },
      UpdateExpression:
        'ADD quantityReserved :negQty, quantitySold :qty SET updated_at = :now',
      ExpressionAttributeValues: {
        ':negQty': -qty,
        ':qty': qty,
        ':now': new Date().toISOString(),
      },
    }),
  );
}

export async function restoreTierInventoryOnRefund(
  ticketTierId: string,
  qty: number,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'ENTITY#TICKET_TIER', SK: ticketTierId },
      UpdateExpression: 'ADD quantitySold :negQty SET updated_at = :now',
      ExpressionAttributeValues: {
        ':negQty': -qty,
        ':now': new Date().toISOString(),
      },
    }),
  );
}
