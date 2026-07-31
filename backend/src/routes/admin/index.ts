// ──────────────────────────────────────────
// Admin API root — mounts all admin sub-routers under /api/admin
// ──────────────────────────────────────────

import { Router } from 'express';
import eventsRoutes from './events';
import bookingsRoutes from './bookings';
import refundsRoutes from './refunds';
import communicationsRoutes from './communications';
import reportsRoutes from './reports';
import settingsRoutes from './settings';
import adminUsersRoutes from './admin-users';
import auditLogRoutes from './audit-log';
import customersRoutes from './customers';
import subscribersRoutes from './subscribers';
import galleryRoutes from './gallery';
import serviceEnquiriesRoutes from './service-enquiries';

const router = Router();

router.use('/events', eventsRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/refunds', refundsRoutes);
router.use('/communications', communicationsRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin-users', adminUsersRoutes);
router.use('/audit-log', auditLogRoutes);
router.use('/customers', customersRoutes);
router.use('/subscribers', subscribersRoutes);
router.use('/gallery', galleryRoutes);
router.use('/service-enquiries', serviceEnquiriesRoutes);

export default router;
