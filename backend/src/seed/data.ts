// ──────────────────────────────────────────
// Local Dev Seed Data — Brothers Beats Events
// Loaded into the in-memory store on server startup (USE_DYNAMODB unset).
// Covers: 1 super admin, 1 admin, 2 customers, 6 events across every status/
// availability scenario, multiple ticket tiers, confirmed/pending/refunded
// bookings, subscribers in every status, and draft/sent campaigns.
// ──────────────────────────────────────────

import { v4 as uuid } from 'uuid';
import { store } from '../store';
import { signTicket } from '../services/tickets';
import {
  User,
  EventEntity,
  TicketTierEntity,
  BookingEntity,
  TicketEntity,
  RefundEntity,
  SubscriberEntity,
  CampaignEntity,
  GalleryMediaEntity,
  EventServiceEnquiryEntity,
} from '../types';

const now = new Date().toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

function bookingRef(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'BBE-';
  for (let i = 0; i < 8; i++) ref += alphabet[Math.floor(Math.random() * alphabet.length)];
  return ref;
}

// ── Users ──
const superAdmin: User = {
  id: 'user-superadmin-001',
  email: 'superadmin@brothersbeats.events',
  display_name: 'Sam Brothers',
  role: 'SUPER_ADMIN',
  google_verified: true,
  marketing_consent: false,
  created_at: daysAgo(90),
  updated_at: now,
};

const admin: User = {
  id: 'user-admin-001',
  email: 'admin@brothersbeats.events',
  display_name: 'Jamie Ops',
  role: 'ADMIN',
  google_verified: true,
  marketing_consent: false,
  created_at: daysAgo(60),
  updated_at: now,
};

const customer1: User = {
  id: 'user-customer-001',
  email: 'alex@example.com',
  display_name: 'Alex Rivera',
  role: 'CUSTOMER',
  google_verified: true,
  marketing_consent: true,
  marketing_consent_version: '1.0',
  category_preferences: ['ENTERTAINMENT', 'COMMUNITY'],
  city_preference: 'Dublin',
  created_at: daysAgo(45),
  updated_at: now,
};

const customer2: User = {
  id: 'user-customer-002',
  email: 'morgan@example.com',
  display_name: 'Morgan Lee',
  role: 'CUSTOMER',
  google_verified: false,
  marketing_consent: false,
  created_at: daysAgo(20),
  updated_at: now,
};

// ── Events ──

const eventUpcoming: EventEntity = {
  id: 'event-upcoming-001',
  slug: 'summer-beats-festival',
  title: 'Summer Beats Festival',
  category: 'ENTERTAINMENT',
  shortDescription: 'An open-air night of live music from local bands.',
  longDescription: 'Join us for an unforgettable evening of live music featuring three local bands, food trucks, and a licensed bar. Doors open at 6:30pm.',
  status: 'PUBLISHED',
  visibility: 'PUBLIC',
  venueName: 'Iveagh Gardens',
  venueAddress: 'Clonmel Street',
  city: 'Dublin',
  countyOrRegion: 'Dublin',
  country: 'Ireland',
  mapUrl: 'https://maps.google.com/?q=Iveagh+Gardens+Dublin',
  startDateTime: daysFromNow(21),
  endDateTime: daysFromNow(21),
  doorsOpenAt: daysFromNow(21),
  timezone: 'Europe/Dublin',
  capacity: 300,
  totalTicketsSold: 40,
  totalTicketsReserved: 0,
  perOrderLimit: 8,
  heroImageUrl: undefined,
  refundPolicy: 'Full refund up to 7 days before the event.',
  collectAttendeeNames: true,
  collectAttendeeEmails: false,
  collectBuyerPhone: false,
  allowGuestCheckout: true,
  reminderScheduleHours: [168, 24],
  returnInventoryOnRefund: true,
  createdBy: admin.id,
  updatedBy: admin.id,
  created_at: daysAgo(30),
  updated_at: now,
  publishedAt: daysAgo(30),
};

const eventEarlyBird: EventEntity = {
  id: 'event-earlybird-001',
  slug: 'winter-jazz-night',
  title: 'Winter Jazz Night',
  category: 'ENTERTAINMENT',
  shortDescription: 'An intimate evening of jazz — early bird tickets available now.',
  longDescription: 'A cosy night of jazz standards and original compositions from the Brothers Beats house quartet.',
  status: 'PUBLISHED',
  visibility: 'PUBLIC',
  venueName: 'The Sugar Club',
  venueAddress: '8 Lower Leeson Street',
  city: 'Dublin',
  country: 'Ireland',
  startDateTime: daysFromNow(45),
  endDateTime: daysFromNow(45),
  timezone: 'Europe/Dublin',
  capacity: 150,
  totalTicketsSold: 10,
  totalTicketsReserved: 0,
  perOrderLimit: 6,
  collectAttendeeNames: true,
  collectAttendeeEmails: false,
  collectBuyerPhone: false,
  allowGuestCheckout: true,
  reminderScheduleHours: [168, 24],
  returnInventoryOnRefund: true,
  createdBy: admin.id,
  updatedBy: admin.id,
  created_at: daysAgo(15),
  updated_at: now,
  publishedAt: daysAgo(15),
};

const eventGroup: EventEntity = {
  id: 'event-group-001',
  slug: 'corporate-away-day',
  title: 'Corporate Away Day',
  category: 'CORPORATE',
  shortDescription: 'Team-building day with workshops and live entertainment. Group pricing available.',
  longDescription: 'A full-day corporate event including workshops, catered lunch, and an evening entertainment session. Group tickets recommended for teams of 5+.',
  status: 'PUBLISHED',
  visibility: 'UNLISTED',
  venueName: 'The Convention Centre',
  venueAddress: 'Spencer Dock',
  city: 'Dublin',
  country: 'Ireland',
  startDateTime: daysFromNow(60),
  endDateTime: daysFromNow(60),
  timezone: 'Europe/Dublin',
  capacity: 200,
  totalTicketsSold: 25,
  totalTicketsReserved: 0,
  perOrderLimit: 20,
  collectAttendeeNames: true,
  collectAttendeeEmails: true,
  collectBuyerPhone: true,
  allowGuestCheckout: false,
  reminderScheduleHours: [168, 24],
  returnInventoryOnRefund: true,
  createdBy: admin.id,
  updatedBy: admin.id,
  created_at: daysAgo(10),
  updated_at: now,
  publishedAt: daysAgo(10),
};

const eventAlmostSoldOut: EventEntity = {
  id: 'event-almost-001',
  slug: 'acoustic-sessions-vol-3',
  title: 'Acoustic Sessions Vol. 3',
  category: 'ENTERTAINMENT',
  shortDescription: 'Selling fast — only a handful of tickets remain!',
  longDescription: 'The third instalment of our stripped-back acoustic sessions series, featuring surprise guest performers.',
  status: 'PUBLISHED',
  visibility: 'PUBLIC',
  venueName: 'Whelan\'s',
  venueAddress: '25 Wexford Street',
  city: 'Dublin',
  country: 'Ireland',
  startDateTime: daysFromNow(10),
  endDateTime: daysFromNow(10),
  timezone: 'Europe/Dublin',
  capacity: 100,
  totalTicketsSold: 90,
  totalTicketsReserved: 0,
  perOrderLimit: 4,
  collectAttendeeNames: true,
  collectAttendeeEmails: false,
  collectBuyerPhone: false,
  allowGuestCheckout: true,
  reminderScheduleHours: [168, 24],
  returnInventoryOnRefund: true,
  createdBy: admin.id,
  updatedBy: admin.id,
  created_at: daysAgo(25),
  updated_at: now,
  publishedAt: daysAgo(25),
};

const eventSoldOut: EventEntity = {
  id: 'event-soldout-001',
  slug: 'new-years-eve-bash',
  title: 'New Year\'s Eve Bash',
  category: 'ENTERTAINMENT',
  shortDescription: 'SOLD OUT — see you on the dance floor!',
  longDescription: 'Ring in the new year with live DJs, a countdown, and a champagne toast at midnight.',
  status: 'SOLD_OUT',
  visibility: 'PUBLIC',
  venueName: 'The Round Room at the Mansion House',
  venueAddress: 'Dawson Street',
  city: 'Dublin',
  country: 'Ireland',
  startDateTime: daysFromNow(90),
  endDateTime: daysFromNow(90),
  timezone: 'Europe/Dublin',
  capacity: 50,
  totalTicketsSold: 50,
  totalTicketsReserved: 0,
  perOrderLimit: 6,
  collectAttendeeNames: true,
  collectAttendeeEmails: false,
  collectBuyerPhone: false,
  allowGuestCheckout: true,
  reminderScheduleHours: [168, 24],
  returnInventoryOnRefund: true,
  createdBy: admin.id,
  updatedBy: admin.id,
  created_at: daysAgo(40),
  updated_at: now,
  publishedAt: daysAgo(40),
};

const eventCancelled: EventEntity = {
  id: 'event-cancelled-001',
  slug: 'spring-block-party',
  title: 'Spring Block Party',
  category: 'COMMUNITY',
  shortDescription: 'This event has been cancelled.',
  longDescription: 'Originally planned as a neighbourhood block party with live music and local food vendors.',
  status: 'CANCELLED',
  visibility: 'PUBLIC',
  venueName: 'Smithfield Square',
  city: 'Dublin',
  country: 'Ireland',
  startDateTime: daysFromNow(15),
  endDateTime: daysFromNow(15),
  timezone: 'Europe/Dublin',
  capacity: 400,
  totalTicketsSold: 15,
  totalTicketsReserved: 0,
  perOrderLimit: 8,
  collectAttendeeNames: true,
  collectAttendeeEmails: false,
  collectBuyerPhone: false,
  allowGuestCheckout: true,
  reminderScheduleHours: [168, 24],
  returnInventoryOnRefund: true,
  cancellationReason: 'Venue unavailable due to unforeseen circumstances.',
  cancellationMessage: 'We\'re sorry — this event has been cancelled due to venue unavailability. Full refunds are being processed automatically.',
  createdBy: admin.id,
  updatedBy: admin.id,
  created_at: daysAgo(20),
  updated_at: now,
  publishedAt: daysAgo(20),
  cancelledAt: daysAgo(2),
};

const events = [eventUpcoming, eventEarlyBird, eventGroup, eventAlmostSoldOut, eventSoldOut, eventCancelled];

// ── Ticket Tiers ──

const tiers: TicketTierEntity[] = [
  {
    id: 'tier-upcoming-standard', eventId: eventUpcoming.id, type: 'STANDARD', name: 'General Admission',
    priceAmountMinor: 2500, currency: 'EUR', salesStartAt: daysAgo(30), salesEndAt: daysFromNow(21),
    maxQuantity: 250, quantitySold: 35, quantityReserved: 0, minPerOrder: 1, maxPerOrder: 8,
    visible: true, active: true, sortOrder: 0, created_at: daysAgo(30), updated_at: now,
  },
  {
    id: 'tier-upcoming-vip', eventId: eventUpcoming.id, type: 'VIP', name: 'VIP (Front Section + Drink)',
    priceAmountMinor: 5500, currency: 'EUR', salesStartAt: daysAgo(30), salesEndAt: daysFromNow(21),
    maxQuantity: 50, quantitySold: 5, quantityReserved: 0, minPerOrder: 1, maxPerOrder: 4,
    visible: true, active: true, sortOrder: 1, created_at: daysAgo(30), updated_at: now,
  },
  {
    id: 'tier-earlybird-early', eventId: eventEarlyBird.id, type: 'EARLY_BIRD', name: 'Early Bird',
    priceAmountMinor: 1800, currency: 'EUR', salesStartAt: daysAgo(15), salesEndAt: daysFromNow(14),
    maxQuantity: 40, quantitySold: 10, quantityReserved: 0, minPerOrder: 1, maxPerOrder: 6,
    visible: true, active: true, sortOrder: 0, created_at: daysAgo(15), updated_at: now,
  },
  {
    id: 'tier-earlybird-standard', eventId: eventEarlyBird.id, type: 'STANDARD', name: 'Standard',
    priceAmountMinor: 2800, currency: 'EUR', salesStartAt: daysFromNow(14), salesEndAt: daysFromNow(45),
    maxQuantity: 110, quantitySold: 0, quantityReserved: 0, minPerOrder: 1, maxPerOrder: 6,
    visible: true, active: true, sortOrder: 1, created_at: daysAgo(15), updated_at: now,
  },
  {
    id: 'tier-group-standard', eventId: eventGroup.id, type: 'GROUP', name: 'Team Ticket (min. 5)',
    priceAmountMinor: 4000, currency: 'EUR', salesStartAt: daysAgo(10), salesEndAt: daysFromNow(60),
    maxQuantity: 200, quantitySold: 25, quantityReserved: 0, minPerOrder: 5, maxPerOrder: 20,
    groupMinSize: 5, visible: true, active: true, sortOrder: 0, created_at: daysAgo(10), updated_at: now,
  },
  {
    id: 'tier-almost-standard', eventId: eventAlmostSoldOut.id, type: 'STANDARD', name: 'General Admission',
    priceAmountMinor: 2000, currency: 'EUR', salesStartAt: daysAgo(25), salesEndAt: daysFromNow(10),
    maxQuantity: 100, quantitySold: 90, quantityReserved: 0, minPerOrder: 1, maxPerOrder: 4,
    visible: true, active: true, sortOrder: 0, created_at: daysAgo(25), updated_at: now,
  },
  {
    id: 'tier-soldout-standard', eventId: eventSoldOut.id, type: 'STANDARD', name: 'General Admission',
    priceAmountMinor: 6000, currency: 'EUR', salesStartAt: daysAgo(40), salesEndAt: daysFromNow(90),
    maxQuantity: 50, quantitySold: 50, quantityReserved: 0, minPerOrder: 1, maxPerOrder: 6,
    visible: true, active: true, sortOrder: 0, created_at: daysAgo(40), updated_at: now,
  },
  {
    id: 'tier-cancelled-standard', eventId: eventCancelled.id, type: 'STANDARD', name: 'General Admission',
    priceAmountMinor: 1500, currency: 'EUR', salesStartAt: daysAgo(20), salesEndAt: daysFromNow(15),
    maxQuantity: 400, quantitySold: 15, quantityReserved: 0, minPerOrder: 1, maxPerOrder: 8,
    visible: true, active: false, sortOrder: 0, created_at: daysAgo(20), updated_at: now,
  },
];

// ── Bookings ──

const confirmedBooking: BookingEntity = {
  id: 'booking-confirmed-001',
  bookingReference: bookingRef(),
  customerUserId: customer1.id,
  eventId: eventUpcoming.id,
  eventTitleSnapshot: eventUpcoming.title,
  eventStartDateTimeSnapshot: eventUpcoming.startDateTime,
  venueNameSnapshot: eventUpcoming.venueName,
  ticketTierId: 'tier-upcoming-standard',
  ticketTierNameSnapshot: 'General Admission',
  quantity: 2,
  unitPriceAmountMinor: 2500,
  subtotalAmountMinor: 5000,
  feesAmountMinor: 0,
  totalAmountMinor: 5000,
  refundedAmountMinor: 0,
  currency: 'EUR',
  bookingStatus: 'CONFIRMED',
  paymentStatus: 'SUCCEEDED',
  buyerName: customer1.display_name,
  buyerEmail: customer1.email,
  normalizedBuyerEmail: customer1.email.toLowerCase(),
  attendees: [
    { attendeeId: 'att-001', name: 'Alex Rivera' },
    { attendeeId: 'att-002', name: 'Jordan Rivera' },
  ],
  source: 'ONLINE',
  paymentMethod: 'STRIPE',
  paymentProvider: 'STRIPE',
  paymentProviderPaymentIntentId: 'pi_seed_confirmed_001',
  confirmedAt: daysAgo(5),
  createdBy: customer1.id,
  created_at: daysAgo(5),
  updated_at: daysAgo(5),
};

const pendingBooking: BookingEntity = {
  id: 'booking-pending-001',
  bookingReference: bookingRef(),
  customerUserId: customer2.id,
  eventId: eventEarlyBird.id,
  eventTitleSnapshot: eventEarlyBird.title,
  eventStartDateTimeSnapshot: eventEarlyBird.startDateTime,
  venueNameSnapshot: eventEarlyBird.venueName,
  ticketTierId: 'tier-earlybird-early',
  ticketTierNameSnapshot: 'Early Bird',
  quantity: 1,
  unitPriceAmountMinor: 1800,
  subtotalAmountMinor: 1800,
  feesAmountMinor: 0,
  totalAmountMinor: 1800,
  refundedAmountMinor: 0,
  currency: 'EUR',
  bookingStatus: 'RESERVED_PENDING_PAYMENT',
  paymentStatus: 'PENDING',
  buyerName: customer2.display_name,
  buyerEmail: customer2.email,
  normalizedBuyerEmail: customer2.email.toLowerCase(),
  attendees: [{ attendeeId: 'att-003', name: 'Morgan Lee' }],
  source: 'ONLINE',
  paymentMethod: 'STRIPE',
  paymentProvider: 'STRIPE',
  paymentProviderSessionId: 'cs_seed_pending_001',
  reservedUntil: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
  createdBy: customer2.id,
  created_at: now,
  updated_at: now,
};

const refundedBooking: BookingEntity = {
  id: 'booking-refunded-001',
  bookingReference: bookingRef(),
  customerUserId: customer1.id,
  eventId: eventCancelled.id,
  eventTitleSnapshot: eventCancelled.title,
  eventStartDateTimeSnapshot: eventCancelled.startDateTime,
  venueNameSnapshot: eventCancelled.venueName,
  ticketTierId: 'tier-cancelled-standard',
  ticketTierNameSnapshot: 'General Admission',
  quantity: 1,
  unitPriceAmountMinor: 1500,
  subtotalAmountMinor: 1500,
  feesAmountMinor: 0,
  totalAmountMinor: 1500,
  refundedAmountMinor: 1500,
  currency: 'EUR',
  bookingStatus: 'REFUNDED',
  paymentStatus: 'REFUNDED',
  buyerName: customer1.display_name,
  buyerEmail: customer1.email,
  normalizedBuyerEmail: customer1.email.toLowerCase(),
  attendees: [{ attendeeId: 'att-004', name: 'Alex Rivera' }],
  source: 'ONLINE',
  paymentMethod: 'STRIPE',
  paymentProvider: 'STRIPE',
  paymentProviderPaymentIntentId: 'pi_seed_refunded_001',
  confirmedAt: daysAgo(18),
  cancellationReason: 'Event cancelled by organizer',
  cancelledAt: daysAgo(2),
  createdBy: customer1.id,
  created_at: daysAgo(18),
  updated_at: daysAgo(2),
};

const bookings = [confirmedBooking, pendingBooking, refundedBooking];

// ── Tickets (for the confirmed booking) ──
function makeTicket(bookingId: string, eventId: string, ticketTierId: string, attendeeName: string): TicketEntity {
  const id = `ticket-${uuid()}`;
  return {
    id,
    bookingId,
    eventId,
    ticketTierId,
    attendeeName,
    ticketNumber: `BBE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${id.slice(-6).toUpperCase()}`,
    status: 'VALID',
    qrCodeHash: signTicket(id),
    created_at: daysAgo(5),
    updated_at: daysAgo(5),
  };
}

const tickets: TicketEntity[] = [
  makeTicket(confirmedBooking.id, eventUpcoming.id, 'tier-upcoming-standard', 'Alex Rivera'),
  makeTicket(confirmedBooking.id, eventUpcoming.id, 'tier-upcoming-standard', 'Jordan Rivera'),
];

// ── Refund (for the refunded booking) ──
const refund: RefundEntity = {
  id: 'refund-001',
  bookingId: refundedBooking.id,
  eventId: eventCancelled.id,
  amountMinor: 1500,
  currency: 'EUR',
  reason: 'Event cancelled by organizer',
  status: 'SUCCEEDED',
  provider: 'STRIPE',
  providerRefundId: 're_seed_001',
  requestedBy: admin.id,
  requestedAt: daysAgo(2),
  completedAt: daysAgo(2),
  created_at: daysAgo(2),
  updated_at: daysAgo(2),
};

// ── Subscribers ──
const subscribers: SubscriberEntity[] = [
  {
    id: 'sub-001', email: 'alex@example.com', normalizedEmail: 'alex@example.com', fullName: 'Alex Rivera',
    customerUserId: customer1.id, status: 'SUBSCRIBED', categories: ['ENTERTAINMENT'], city: 'Dublin',
    source: 'CUSTOMER_ACCOUNT', consentTextVersion: '1.0', subscribedAt: daysAgo(45),
    created_at: daysAgo(45), updated_at: daysAgo(45),
  },
  {
    id: 'sub-002', email: 'unsubscribed@example.com', normalizedEmail: 'unsubscribed@example.com',
    status: 'UNSUBSCRIBED', source: 'WEBSITE_FOOTER', consentTextVersion: '1.0',
    subscribedAt: daysAgo(60), unsubscribedAt: daysAgo(10),
    created_at: daysAgo(60), updated_at: daysAgo(10),
  },
  {
    id: 'sub-003', email: 'bounced@example.com', normalizedEmail: 'bounced@example.com',
    status: 'BOUNCED', source: 'WEBSITE_FOOTER', consentTextVersion: '1.0',
    subscribedAt: daysAgo(30), created_at: daysAgo(30), updated_at: daysAgo(29),
  },
];

// ── Campaigns ──
const draftCampaign: CampaignEntity = {
  id: 'campaign-draft-001',
  name: 'Summer Beats Festival — Last Call',
  subject: 'Only a few tickets left for Summer Beats Festival!',
  content: {
    subject: 'Only a few tickets left for Summer Beats Festival!',
    heading: 'Don\'t miss out',
    body: 'Tickets for Summer Beats Festival are going fast — grab yours before they\'re gone.',
    ctaLabel: 'Get Tickets',
    ctaUrl: 'https://brothersbeats.events/events/summer-beats-festival',
    eventId: eventUpcoming.id,
  },
  audienceType: 'ALL_SUBSCRIBERS',
  status: 'DRAFT',
  createdBy: admin.id,
  created_at: daysAgo(1),
  updated_at: daysAgo(1),
};

const sentCampaign: CampaignEntity = {
  id: 'campaign-sent-001',
  name: 'Welcome to Brothers Beats Events',
  subject: 'Welcome! Here\'s what\'s coming up',
  content: {
    subject: 'Welcome! Here\'s what\'s coming up',
    heading: 'Welcome to Brothers Beats Events',
    body: 'Thanks for subscribing! Check out our upcoming events.',
    ctaLabel: 'Browse Events',
    ctaUrl: 'https://brothersbeats.events/events',
  },
  audienceType: 'ALL_SUBSCRIBERS',
  status: 'SENT',
  sentAt: daysAgo(14),
  recipientCount: 120,
  deliveredCount: 118,
  bounceCount: 2,
  complaintCount: 0,
  createdBy: admin.id,
  created_at: daysAgo(15),
  updated_at: daysAgo(14),
};

// ── Gallery media (4 published photos, 2 published YouTube videos, 1 draft) ──
const galleryItems: GalleryMediaEntity[] = [
  {
    id: 'media-photo-001', type: 'IMAGE', status: 'PUBLISHED',
    title: 'Crowd dancing at Summer Beats Festival', altText: 'A large crowd dancing under stage lighting at an outdoor festival',
    caption: 'Summer Beats Festival, 2025', eventId: eventUpcoming.id, eventTitleSnapshot: eventUpcoming.title,
    imageS3Key: 'gallery/seed-photo-001.jpg', imageUrl: 'https://images.brothersbeats.events/gallery/seed-photo-001.jpg',
    imageWidth: 1600, imageHeight: 1000, featured: true, sortOrder: 1, publishedAt: daysAgo(20),
    createdBy: admin.id, updatedBy: admin.id, created_at: daysAgo(21), updated_at: daysAgo(20),
  },
  {
    id: 'media-photo-002', type: 'IMAGE', status: 'PUBLISHED',
    title: 'DJ set at Brothers Beats Live', altText: 'A DJ performing on stage with colourful lighting',
    caption: 'Brothers Beats Live, 2025', imageS3Key: 'gallery/seed-photo-002.jpg',
    imageUrl: 'https://images.brothersbeats.events/gallery/seed-photo-002.jpg',
    imageWidth: 1600, imageHeight: 1067, featured: false, sortOrder: 2, publishedAt: daysAgo(18),
    createdBy: admin.id, updatedBy: admin.id, created_at: daysAgo(19), updated_at: daysAgo(18),
  },
  {
    id: 'media-photo-003', type: 'IMAGE', status: 'PUBLISHED',
    title: 'Community gathering in Dublin', altText: 'Attendees mingling at a community event in a park',
    caption: 'Community Day, 2025', imageS3Key: 'gallery/seed-photo-003.jpg',
    imageUrl: 'https://images.brothersbeats.events/gallery/seed-photo-003.jpg',
    imageWidth: 1600, imageHeight: 1200, featured: false, sortOrder: 3, publishedAt: daysAgo(14),
    createdBy: admin.id, updatedBy: admin.id, created_at: daysAgo(15), updated_at: daysAgo(14),
  },
  {
    id: 'media-photo-004', type: 'IMAGE', status: 'PUBLISHED',
    title: 'Corporate awards evening', altText: 'Guests applauding at a corporate awards dinner',
    caption: 'Corporate Awards Night, 2025', imageS3Key: 'gallery/seed-photo-004.jpg',
    imageUrl: 'https://images.brothersbeats.events/gallery/seed-photo-004.jpg',
    imageWidth: 1600, imageHeight: 1067, featured: false, sortOrder: 4, publishedAt: daysAgo(10),
    createdBy: admin.id, updatedBy: admin.id, created_at: daysAgo(11), updated_at: daysAgo(10),
  },
  {
    id: 'media-video-001', type: 'YOUTUBE_VIDEO', status: 'PUBLISHED',
    title: 'Summer Beats Festival — Highlights Reel', caption: 'Relive the best moments from Summer Beats Festival',
    eventId: eventUpcoming.id, eventTitleSnapshot: eventUpcoming.title,
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', youtubeVideoId: 'dQw4w9WgXcQ',
    featured: true, sortOrder: 5, publishedAt: daysAgo(19),
    createdBy: admin.id, updatedBy: admin.id, created_at: daysAgo(20), updated_at: daysAgo(19),
  },
  {
    id: 'media-video-002', type: 'YOUTUBE_VIDEO', status: 'PUBLISHED',
    title: 'Brothers Beats — Behind the Scenes', caption: 'A look at how we bring our events to life',
    youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', youtubeVideoId: 'jNQXAC9IVRw',
    featured: false, sortOrder: 6, publishedAt: daysAgo(7),
    createdBy: admin.id, updatedBy: admin.id, created_at: daysAgo(8), updated_at: daysAgo(7),
  },
  {
    id: 'media-photo-draft-001', type: 'IMAGE', status: 'DRAFT',
    title: 'Unreleased venue walkthrough (draft)', altText: 'Empty venue set up ahead of an event',
    imageS3Key: 'gallery/seed-photo-draft-001.jpg', imageUrl: 'https://images.brothersbeats.events/gallery/seed-photo-draft-001.jpg',
    featured: false, sortOrder: 7, createdBy: admin.id, updatedBy: admin.id, created_at: daysAgo(1), updated_at: daysAgo(1),
  },
];

// ── Event-service enquiries (3, across different statuses) ──
const serviceEnquiries: EventServiceEnquiryEntity[] = [
  {
    id: 'enquiry-001', eventServiceType: 'WEDDING', status: 'NEW',
    fullName: 'Priya Nair', email: 'priya.nair@example.com', normalizedEmail: 'priya.nair@example.com',
    phone: '+353851234567', preferredDate: daysFromNow(120), venueOrCity: 'Dublin',
    estimatedGuestCount: 140, budgetRange: '€8,000–€12,000',
    message: 'Looking for full-service management for our wedding reception, including entertainment and guest coordination.',
    consentToContact: true, source: 'SERVICES_PAGE', created_at: daysAgo(3), updated_at: daysAgo(3),
  },
  {
    id: 'enquiry-002', eventServiceType: 'CORPORATE', status: 'CONTACTED',
    fullName: 'Michael O\'Sullivan', email: 'michael.osullivan@example.com', normalizedEmail: 'michael.osullivan@example.com',
    phone: '+353871112222', preferredDate: daysFromNow(45), venueOrCity: 'Cork', estimatedGuestCount: 80,
    budgetRange: '€5,000–€7,000', message: 'Need help organising our annual company celebration, including catering coordination and entertainment booking.',
    consentToContact: true, internalNotes: 'Called 2025-XX-XX, sending proposal by end of week.',
    assignedAdminUserId: admin.id, source: 'CONTACT_PAGE', created_at: daysAgo(9), updated_at: daysAgo(6),
  },
  {
    id: 'enquiry-003', eventServiceType: 'BIRTHDAY', status: 'CLOSED',
    fullName: 'Aoife Byrne', email: 'aoife.byrne@example.com', normalizedEmail: 'aoife.byrne@example.com',
    preferredDate: daysAgo(20), venueOrCity: 'Galway', estimatedGuestCount: 30,
    message: '30th birthday party — already booked with another vendor, thanks anyway.',
    consentToContact: true, internalNotes: 'Client went with another provider. Closed, no further action.',
    source: 'SERVICES_PAGE', created_at: daysAgo(40), updated_at: daysAgo(35),
  },
];

// ── Seed Function ──
export function seedStore(): void {
  store.reset();

  [superAdmin, admin, customer1, customer2].forEach((u) => store.users.set(u.id, u));
  events.forEach((e) => store.events.set(e.id, e));
  tiers.forEach((t) => store.ticketTiers.set(t.id, t));
  bookings.forEach((b) => store.bookings.set(b.id, b));
  tickets.forEach((t) => store.tickets.set(t.id, t));
  store.refunds.set(refund.id, refund);
  subscribers.forEach((s) => store.subscribers.set(s.id, s));
  [draftCampaign, sentCampaign].forEach((c) => store.campaigns.set(c.id, c));
  galleryItems.forEach((m) => store.galleryMedia.set(m.id, m));
  serviceEnquiries.forEach((e) => store.serviceEnquiries.set(e.id, e));

  console.log('✅ Seed data loaded successfully');
  console.log(`   Users: ${store.users.size}`);
  console.log(`   Events: ${store.events.size}`);
  console.log(`   Ticket Tiers: ${store.ticketTiers.size}`);
  console.log(`   Bookings: ${store.bookings.size}`);
  console.log(`   Tickets: ${store.tickets.size}`);
  console.log(`   Refunds: ${store.refunds.size}`);
  console.log(`   Subscribers: ${store.subscribers.size}`);
  console.log(`   Campaigns: ${store.campaigns.size}`);
  console.log(`   Gallery media: ${store.galleryMedia.size}`);
  console.log(`   Service enquiries: ${store.serviceEnquiries.size}`);
}
