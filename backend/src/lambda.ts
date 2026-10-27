// ──────────────────────────────────────────
// Lambda Handler — wraps Express app with serverless-http
// ──────────────────────────────────────────

import serverless from 'serverless-http';
import app from './server';
import type { Handler } from 'aws-lambda';
import { expirePendingReservations } from './services/inventory';

const apiHandler = serverless(app);

export const handler: Handler = async (event, context) => {
  if (event.source === 'brothers-beats.reservation-expiry') {
    await expirePendingReservations();
    return { success: true };
  }
  return apiHandler(event, context);
};
