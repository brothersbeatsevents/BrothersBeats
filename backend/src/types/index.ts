// ──────────────────────────────────────────
// Shared Types for Brothers Beats Events Ticketing Platform
// ──────────────────────────────────────────

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  cognito_sub?: string;
  email: string;
  display_name: string;
  role: UserRole;
  google_verified: boolean;
  avatar_url?: string;
  phone?: string;
  marketing_consent: boolean;
  marketing_consent_version?: string;
  category_preferences?: EventCategory[];
  city_preference?: string;
  pending_email?: string; // email update awaiting Cognito verification
  disabled?: boolean;
  created_at: string;
  updated_at: string;
}

export type EventCategory =
  | 'COMMUNITY'
  | 'WEDDING'
  | 'BIRTHDAY'
  | 'ENTERTAINMENT'
  | 'CORPORATE'
  | 'OTHER';

export type EventStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'SALES_PAUSED'
  | 'SOLD_OUT'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'ARCHIVED';

export type EventVisibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

export interface EventEntity {
  id: string; // eventId
  slug: string;
  title: string;
  category: EventCategory;
  shortDescription: string;
  longDescription: string;
  status: EventStatus;
  visibility: EventVisibility;

  venueName: string;
  venueAddress?: string;
  city: string;
  countyOrRegion?: string;
  country: string;
  postalCode?: string;
  mapUrl?: string;

  startDateTime: string;
  endDateTime: string;
  doorsOpenAt?: string;
  timezone: string;

  capacity: number;
  totalTicketsSold: number;
  totalTicketsReserved: number;
  perOrderLimit: number;

  heroImageUrl?: string;
  galleryImageUrls?: string[];
  socialImageUrl?: string;

  seoTitle?: string;
  seoDescription?: string;

  refundPolicy?: string;
  termsAndConditions?: string;
  supportEmail?: string;

  collectAttendeeNames: boolean;
  collectAttendeeEmails: boolean;
  collectBuyerPhone: boolean;
  allowGuestCheckout: boolean;

  reminderScheduleHours: number[];
  returnInventoryOnRefund: boolean;

  cancellationReason?: string;
  cancellationMessage?: string;

  createdBy: string;
  updatedBy: string;
  created_at: string;
  updated_at: string;
  publishedAt?: string;
  cancelledAt?: string;
}

export type TicketTierType =
  | 'EARLY_BIRD'
  | 'STANDARD'
  | 'GROUP'
  | 'VIP'
  | 'COMPLIMENTARY'
  | 'CUSTOM';

export interface TicketTierEntity {
  id: string; // ticketTierId
  eventId: string;
  type: TicketTierType;
  name: string;
  description?: string;

  priceAmountMinor: number;
  currency: string;

  salesStartAt: string;
  salesEndAt: string;

  maxQuantity: number;
  quantitySold: number;
  quantityReserved: number;

  minPerOrder: number;
  maxPerOrder: number;
  groupMinSize?: number;

  visible: boolean;
  active: boolean;
  sortOrder: number;

  created_at: string;
  updated_at: string;
}

export type BookingStatus =
  | 'RESERVED_PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'EXPIRED'
  | 'PAYMENT_REVIEW_REQUIRED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export type PaymentStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export type BookingSource = 'ONLINE' | 'ADMIN_MANUAL';
export type BookingPaymentMethod =
  | 'STRIPE'
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'COMPLIMENTARY'
  | 'EXTERNAL';

export interface BookingAttendee {
  attendeeId: string;
  name?: string;
  email?: string;
}

export interface BookingEntity {
  id: string; // bookingId
  bookingReference: string;
  customerUserId?: string;

  eventId: string;
  eventTitleSnapshot: string;
  eventStartDateTimeSnapshot: string;
  venueNameSnapshot: string;

  ticketTierId: string;
  ticketTierNameSnapshot: string;

  quantity: number;
  unitPriceAmountMinor: number;
  subtotalAmountMinor: number;
  feesAmountMinor: number;
  totalAmountMinor: number;
  refundedAmountMinor: number;
  currency: string;

  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;

  buyerName: string;
  buyerEmail: string;
  normalizedBuyerEmail: string;
  buyerPhone?: string;

  attendees: BookingAttendee[];

  source: BookingSource;
  paymentMethod: BookingPaymentMethod;

  paymentProvider?: 'STRIPE';
  paymentProviderSessionId?: string;
  paymentProviderPaymentIntentId?: string;
  paymentProviderCustomerId?: string;

  reservedUntil?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;

  internalNotes?: Array<{ note: string; author: string; created_at: string }>;

  createdBy?: string;
  created_at: string;
  updated_at: string;
}

export type TicketStatus = 'VALID' | 'CHECKED_IN' | 'CANCELLED' | 'REFUNDED';

export interface TicketEntity {
  id: string; // ticketId
  bookingId: string;
  eventId: string;
  ticketTierId: string;
  attendeeId?: string;
  attendeeName?: string;

  ticketNumber: string;
  status: TicketStatus;

  qrCodeHash: string;
  qrCodeImageS3Key?: string;
  ticketPdfS3Key?: string;

  checkedInAt?: string;
  checkedInBy?: string;

  created_at: string;
  updated_at: string;
}

export type RefundStatus =
  | 'REQUESTED'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export interface RefundEntity {
  id: string; // refundId
  bookingId: string;
  eventId: string;

  amountMinor: number;
  currency: string;
  reason: string;
  status: RefundStatus;

  ticketIds?: string[];

  provider: 'STRIPE' | 'MANUAL';
  providerRefundId?: string;
  providerFailureCode?: string;
  providerFailureMessage?: string;

  requestedBy: string;
  requestedAt: string;
  completedAt?: string;
  created_at: string;
  updated_at: string;
}

export type SubscriberStatus =
  | 'SUBSCRIBED'
  | 'UNSUBSCRIBED'
  | 'BOUNCED'
  | 'COMPLAINED'
  | 'SUPPRESSED';

export type SubscriberSource =
  | 'WEBSITE_FOOTER'
  | 'CHECKOUT'
  | 'CUSTOMER_ACCOUNT'
  | 'ADMIN_IMPORT';

export interface SubscriberEntity {
  id: string; // subscriberId
  email: string;
  normalizedEmail: string;
  fullName?: string;
  customerUserId?: string;

  status: SubscriberStatus;

  categories?: EventCategory[];
  city?: string;

  source: SubscriberSource;

  consentTextVersion: string;
  subscribedAt: string;
  unsubscribedAt?: string;
  created_at: string;
  updated_at: string;
}

export type CampaignAudienceType =
  | 'ALL_SUBSCRIBERS'
  | 'EVENT_ATTENDEES'
  | 'PAST_ATTENDEES'
  | 'CATEGORY_SUBSCRIBERS'
  | 'CITY_SUBSCRIBERS';

export type CampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'SENDING'
  | 'SENT'
  | 'CANCELLED'
  | 'FAILED';

export interface CampaignContent {
  subject: string;
  preheader?: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  eventId?: string;
  heroImageUrl?: string;
  senderName?: string;
}

export interface CampaignEntity {
  id: string; // campaignId
  name: string;
  subject: string;
  preheader?: string;
  content: CampaignContent;

  audienceType: CampaignAudienceType;
  audienceFilters?: Record<string, unknown>;

  status: CampaignStatus;

  scheduledAt?: string;
  sentAt?: string;

  recipientCount?: number;
  deliveredCount?: number;
  bounceCount?: number;
  complaintCount?: number;

  createdBy: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookEventEntity {
  id: string; // provider event id, used as idempotency key
  provider: 'STRIPE';
  eventType: string;
  processedAt: string;
  created_at: string;
}

export type EmailMessageType =
  | 'VERIFY_EMAIL'
  | 'PASSWORD_RESET'
  | 'BOOKING_CONFIRMATION'
  | 'TICKET_DELIVERY'
  | 'TICKET_RESEND'
  | 'PAYMENT_FAILED'
  | 'RESERVATION_EXPIRED'
  | 'EVENT_REMINDER'
  | 'EVENT_UPDATED'
  | 'EVENT_CANCELLED'
  | 'REFUND_REQUESTED'
  | 'REFUND_COMPLETED'
  | 'REFUND_FAILED'
  | 'CAMPAIGN';

export interface EmailMessageEntity {
  id: string; // emailMessageId (dedupe key for a given type+recipient+booking)
  type: EmailMessageType;
  recipient: string;
  eventId?: string;
  bookingId?: string;
  campaignId?: string;
  providerMessageId?: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntity {
  id: string; // auditId
  actorUserId: string;
  actorRole: 'ADMIN' | 'SUPER_ADMIN' | 'SYSTEM';
  action: string;
  entityType: string;
  entityId: string;
  eventId?: string;
  bookingId?: string;
  summary: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  correlationId: string;
  created_at: string;
}

export interface MediaAsset {
  id: string;
  s3_key: string;
  file_name: string;
  file_type: string;
  url: string;
  alt_text?: string;
  uploaded_by: string;
  created_at: string;
}

export interface EmailSuppression {
  id: string; // suppressed-<email>
  email: string;
  reason: 'bounce' | 'complaint';
  bounce_type?: string;
  bounce_subtype?: string;
  detail?: string;
  suppressed_at: string;
  created_at: string;
}

export interface OrgSettings {
  id: string; // fixed id: 'org-settings'
  organizationName: string;
  supportEmail: string;
  defaultCurrency: string;
  defaultTimezone: string;
  defaultRefundPolicy?: string;
  defaultTermsAndConditions?: string;
  socialLinks?: Record<string, string>;
  updated_at: string;
  updatedBy?: string;
}

// ── Gallery media (public photo/video showcase — admin-authored only) ──
export type GalleryMediaType = 'IMAGE' | 'YOUTUBE_VIDEO';
export type GalleryMediaStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface GalleryMediaEntity {
  id: string; // mediaId
  type: GalleryMediaType;
  status: GalleryMediaStatus;

  title: string;
  caption?: string;
  altText?: string;

  eventId?: string;
  eventTitleSnapshot?: string;

  imageS3Key?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;

  youtubeUrl?: string;
  youtubeVideoId?: string;

  featured: boolean;
  sortOrder: number;

  publishedAt?: string;
  createdBy: string;
  updatedBy: string;
  created_at: string;
  updated_at: string;
}

// ── Event-service enquiries (paid private-event management, contact-led) ──
export type EventServiceEnquiryStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'CLOSED'
  | 'SPAM';

export type EventServiceType =
  | 'BIRTHDAY'
  | 'PRIVATE_PARTY'
  | 'WEDDING'
  | 'CORPORATE'
  | 'COMMUNITY'
  | 'ENTERTAINMENT'
  | 'OTHER';

export interface EventServiceEnquiryEntity {
  id: string; // enquiryId
  eventServiceType: EventServiceType;
  status: EventServiceEnquiryStatus;

  fullName: string;
  email: string;
  normalizedEmail: string;
  phone?: string;

  preferredDate?: string;
  preferredDateEnd?: string;
  venueOrCity?: string;
  estimatedGuestCount?: number;
  budgetRange?: string;
  message: string;
  consentToContact: boolean;

  assignedAdminUserId?: string;
  internalNotes?: string;
  source: 'SERVICES_PAGE' | 'CONTACT_PAGE';

  created_at: string;
  updated_at: string;
}

// ── Pricing ──
export interface PriceQuote {
  quoteId: string;
  eventId: string;
  ticketTierId: string;
  ticketTierName: string;
  quantity: number;
  unitPriceAmountMinor: number;
  subtotalAmountMinor: number;
  feesAmountMinor: number;
  totalAmountMinor: number;
  currency: string;
  expiresAt: string;
}

// API response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
