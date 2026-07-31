// ──────────────────────────────────────────
// In-Memory Data Store (local development)
// Replace with DynamoDB in production
// ──────────────────────────────────────────

import {
  User,
  EventEntity,
  TicketTierEntity,
  BookingEntity,
  TicketEntity,
  RefundEntity,
  SubscriberEntity,
  CampaignEntity,
  WebhookEventEntity,
  EmailMessageEntity,
  MediaAsset,
  AuditLogEntity,
  EmailSuppression,
  OrgSettings,
  GalleryMediaEntity,
  EventServiceEnquiryEntity,
} from '../types';

class Store {
  users: Map<string, User> = new Map();
  events: Map<string, EventEntity> = new Map();
  ticketTiers: Map<string, TicketTierEntity> = new Map();
  bookings: Map<string, BookingEntity> = new Map();
  tickets: Map<string, TicketEntity> = new Map();
  refunds: Map<string, RefundEntity> = new Map();
  subscribers: Map<string, SubscriberEntity> = new Map();
  campaigns: Map<string, CampaignEntity> = new Map();
  webhookEvents: Map<string, WebhookEventEntity> = new Map();
  emailMessages: Map<string, EmailMessageEntity> = new Map();
  mediaAssets: Map<string, MediaAsset> = new Map();
  auditLogs: Map<string, AuditLogEntity> = new Map();
  emailSuppressions: Map<string, EmailSuppression> = new Map();
  orgSettings: Map<string, OrgSettings> = new Map();
  galleryMedia: Map<string, GalleryMediaEntity> = new Map();
  serviceEnquiries: Map<string, EventServiceEnquiryEntity> = new Map();

  // Helper: get all values as array
  getAll<T>(map: Map<string, T>): T[] {
    return Array.from(map.values());
  }

  // Helper: find by field value
  findBy<T extends Record<string, unknown>>(
    map: Map<string, T>,
    field: string,
    value: unknown,
  ): T | undefined {
    return this.getAll(map).find((item) => item[field] === value);
  }

  // Helper: filter by field value
  filterBy<T extends Record<string, unknown>>(
    map: Map<string, T>,
    field: string,
    value: unknown,
  ): T[] {
    return this.getAll(map).filter((item) => item[field] === value);
  }

  // Reset store (for testing)
  reset(): void {
    this.users.clear();
    this.events.clear();
    this.ticketTiers.clear();
    this.bookings.clear();
    this.tickets.clear();
    this.refunds.clear();
    this.subscribers.clear();
    this.campaigns.clear();
    this.webhookEvents.clear();
    this.emailMessages.clear();
    this.mediaAssets.clear();
    this.auditLogs.clear();
    this.emailSuppressions.clear();
    this.orgSettings.clear();
    this.galleryMedia.clear();
    this.serviceEnquiries.clear();
  }
}

// Singleton
export const store = new Store();
