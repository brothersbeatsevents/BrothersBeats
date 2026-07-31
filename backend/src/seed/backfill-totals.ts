/**
 * Recompute total_donated and donation_years on every user record
 * by summing their completed donation entries.
 *
 * Usage:
 *   DYNAMODB_TABLE=iskon-dublin-prod AWS_PROFILE=iskcon-dev npx ts-node src/seed/backfill-totals.ts
 *
 * Safe to re-run — always recalculates from source records.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE;
if (!TABLE_NAME) {
  console.error('Error: DYNAMODB_TABLE env var is required');
  process.exit(1);
}

const client = new DynamoDBClient({ region: 'eu-west-1' });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

async function scanAll(pk: string): Promise<any[]> {
  const items: any[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': pk },
        ...(lastKey && { ExclusiveStartKey: lastKey }),
      }),
    );
    if (result.Items) items.push(...result.Items);
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return items;
}

async function main() {
  const [users, donations] = await Promise.all([
    scanAll('ENTITY#USER'),
    scanAll('ENTITY#DONATION'),
  ]);

  console.log(`Users: ${users.length}, Donations: ${donations.length}`);

  // Build lookup: email → user id (for email-linked Square imports)
  const emailToUserId = new Map<string, string>();
  for (const u of users) {
    if (u.email) emailToUserId.set(u.email.toLowerCase(), u.id);
  }

  // Group completed donations by user_id — matching by user_id OR donor_email
  const byUser = new Map<string, { total: number; years: Set<number> }>();
  const seenDonationIds = new Map<string, Set<string>>(); // userId → Set<donationId> to avoid double-count

  for (const d of donations) {
    if (d.status !== 'completed') continue;

    // Exclude subscription root records (only count actual payment records)
    // Subscription root records have square_subscription_id but no square_payment_id
    if (d.recurring && d.square_subscription_id && !d.square_payment_id) {
      continue;
    }

    const resolvedId =
      d.user_id ||
      (d.donor_email ? emailToUserId.get(d.donor_email.toLowerCase()) : undefined);
    if (!resolvedId) continue;

    if (!seenDonationIds.has(resolvedId)) seenDonationIds.set(resolvedId, new Set());
    if (seenDonationIds.get(resolvedId)!.has(d.id)) continue;
    seenDonationIds.get(resolvedId)!.add(d.id);

    if (!byUser.has(resolvedId)) byUser.set(resolvedId, { total: 0, years: new Set() });
    const entry = byUser.get(resolvedId)!;
    entry.total += d.amount ?? 0;
    if (d.created_at) {
      const year = new Date(d.created_at).getFullYear();
      entry.years.add(year);
    }
  }

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    const data = byUser.get(user.id);
    const newTotal = data?.total ?? 0;
    const newYears = data
      ? [...data.years].sort((a, b) => b - a)
      : [];

    const currentTotal = user.total_donated ?? 0;
    const currentYears: number[] = user.donation_years ?? [];

    // Skip if nothing changed
    if (
      currentTotal === newTotal &&
      JSON.stringify(currentYears) === JSON.stringify(newYears)
    ) {
      skipped++;
      continue;
    }

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: 'ENTITY#USER', SK: user.id },
        UpdateExpression:
          'SET total_donated = :total, donation_years = :years, updated_at = :now',
        ExpressionAttributeValues: {
          ':total': newTotal,
          ':years': newYears,
          ':now': new Date().toISOString(),
        },
      }),
    );

    const label = user.display_name || user.email || user.id;
    console.log(
      `  ✓ ${label}: €${currentTotal} → €${newTotal}  years: [${newYears.join(', ')}]`,
    );
    updated++;
  }

  console.log(`\nDone. Updated ${updated} user(s), skipped ${skipped} unchanged.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
