// ──────────────────────────────────────────
// DynamoDB Seed Script
// Populates the in-memory store with seed data via seedStore(), then writes
// every record into DynamoDB using the same db.put() facade the app uses.
// Usage: npm run seed  (sets USE_DYNAMODB=true)
// ──────────────────────────────────────────

import { seedStore } from './data';
import { store } from '../store/memory';
import { db } from '../store';

async function run(): Promise<void> {
  if (!process.env.USE_DYNAMODB) {
    console.error('USE_DYNAMODB must be set to seed DynamoDB. Aborting.');
    process.exit(1);
  }

  // Populate the in-memory store first (single source of truth for seed data)
  seedStore();

  const collections: Array<[string, Map<string, unknown>]> = [
    ['users', store.users],
    ['events', store.events],
    ['ticketTiers', store.ticketTiers],
    ['bookings', store.bookings],
    ['tickets', store.tickets],
    ['refunds', store.refunds],
    ['subscribers', store.subscribers],
    ['campaigns', store.campaigns],
    ['webhookEvents', store.webhookEvents],
    ['emailMessages', store.emailMessages],
    ['mediaAssets', store.mediaAssets],
    ['auditLogs', store.auditLogs],
    ['emailSuppressions', store.emailSuppressions],
    ['orgSettings', store.orgSettings],
    ['galleryMedia', store.galleryMedia],
    ['serviceEnquiries', store.serviceEnquiries],
  ];

  for (const [name, map] of collections) {
    let count = 0;
    for (const item of map.values()) {
      await db.put(name as any, item as any);
      count++;
    }
    console.log(`   ${name}: ${count} item(s) written`);
  }

  console.log('✅ DynamoDB seed complete');
}

run().catch((err) => {
  console.error('❌ DynamoDB seed failed:', err);
  process.exit(1);
});
