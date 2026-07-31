// ──────────────────────────────────────────
// Lambda Handler — wraps Express app with serverless-http
// ──────────────────────────────────────────

import serverless from 'serverless-http';
import app from './server';

export const handler = serverless(app);
