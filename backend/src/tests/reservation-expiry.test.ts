import { afterEach, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { expireBookingReservation } from '../store/dynamodb';
import { store } from '../store/memory';
import { seedStore } from '../seed/data';
import type { BookingEntity } from '../types';

let booking: BookingEntity;
const items = [{ ticketTierId: 'tier-one', quantity: 1 }, { ticketTierId: 'tier-two', quantity: 2 }];

beforeEach(() => {
  store.reset();
  seedStore();
  booking = { ...[...store.bookings.values()][0], id: 'booking-expiry', eventId: 'event-expiry', quantity: 3 };
});
afterEach(() => mock.restoreAll());

test('DynamoDB expiry updates booking, event and every ticket type in one guarded transaction', async () => {
  const commands: TransactWriteCommand[] = [];
  mock.method(DynamoDBDocumentClient.prototype, 'send', async (command: TransactWriteCommand) => {
    commands.push(command);
    return {};
  });
  assert.equal(await expireBookingReservation(booking, items), true);
  assert.equal(commands.length, 1);
  assert(commands[0] instanceof TransactWriteCommand);
  const updates = commands[0].input.TransactItems!.map((item) => item.Update!);
  assert.equal(updates.length, 4);
  assert.deepEqual(updates[0].Key, { PK: 'ENTITY#BOOKING', SK: booking.id });
  assert.equal(updates[0].ConditionExpression, 'bookingStatus = :pending');
  assert.equal(updates[0].ExpressionAttributeValues?.[':pending'], 'RESERVED_PENDING_PAYMENT');
  assert.equal(updates[0].ExpressionAttributeValues?.[':expired'], 'EXPIRED');
  assert.deepEqual(updates.slice(1).map((update) => [update.Key?.PK, update.Key?.SK, update.ExpressionAttributeValues?.[':qty']]), [
    ['ENTITY#EVENT', booking.eventId, 3], ['ENTITY#TICKET_TIER', 'tier-one', 1], ['ENTITY#TICKET_TIER', 'tier-two', 2],
  ]);
  assert(updates.slice(1).every((update) => update.ConditionExpression?.includes('>= :qty')));
});

test('an already expired or confirmed booking cannot release inventory again', async () => {
  mock.method(DynamoDBDocumentClient.prototype, 'send', async () => {
    throw Object.assign(new Error('Booking already transitioned'), {
      name: 'TransactionCanceledException', CancellationReasons: [{ Code: 'ConditionalCheckFailed' }],
    });
  });
  assert.equal(await expireBookingReservation(booking, items), false);
});

test('inventory inconsistencies fail the entire transaction for retry', async () => {
  mock.method(DynamoDBDocumentClient.prototype, 'send', async () => {
    throw Object.assign(new Error('Inventory mismatch'), {
      name: 'TransactionCanceledException', CancellationReasons: [{ Code: 'None' }, { Code: 'ConditionalCheckFailed' }],
    });
  });
  await assert.rejects(expireBookingReservation(booking, items), /Inventory mismatch/);
});
