# CLAUDE.md — Brothers Beats Owned-Events Ticketing and Media Platform

> **Purpose of this file:** This is the product specification and execution contract for the coding agent.  
> The task is to deliver a working, production-ready website and ticketing platform—not a static mock-up, landing page, partial prototype, or collection of disconnected screens.

---

# 0. Agent Operating Contract

## 0.1 Non-negotiable execution rules

The implementation must satisfy all of the following:

1. Build the complete public website, customer portal, admin portal, backend APIs, database model, authentication, payments, email workflows, infrastructure, tests, and deployment documentation.
2. Do not stop after scaffolding the repository or creating UI screens.
3. Do not leave primary buttons, forms, dashboards, filters, exports, refund actions, reminder actions, or booking flows disconnected.
4. Do not use `localStorage`, hard-coded arrays, static JSON, or fake dashboard metrics as the production data source.
5. Development seed data is allowed, but it must be clearly separated from production data.
6. Every visible action must have a working success state, loading state, empty state, validation state, and error state.
7. All protected customer and admin screens must use real authentication and authorization.
8. All payment and refund status changes must be driven by verified payment-provider webhooks.
9. All ticket inventory calculations must be enforced by the backend.
10. Do not trust amounts, prices, availability, roles, event status, or refund eligibility sent by the frontend.
11. Do not leave critical `TODO`, placeholder, “coming soon,” or mock-service implementations in the delivered MVP.
12. Run and pass:
    - lint
    - type checking
    - unit tests
    - integration tests
    - production build
13. Include a complete `README.md`, `.env.example`, deployment instructions, seed script, and test instructions.
14. Use accessible, responsive components and test the main flows on mobile and desktop.
15. At the end, provide a delivery checklist showing what is complete, what was tested, and any external setup still required, such as Stripe keys, Google OAuth credentials, or SES domain verification.
16. Do not implement public organiser registration, third-party event submission, external organiser dashboards, or self-service event publishing.
17. Implement the gallery and paid event-management enquiry workflows as complete production features, not static sections.

## 0.2 Required implementation quality

The platform must feel like a real client product:

- No dead links
- No decorative buttons that do nothing
- No fake charts
- No admin actions without confirmation and feedback
- No unprotected admin endpoints
- No public exposure of attendee or buyer data
- No client-side-only inventory logic
- No confirmation of payment based only on a browser redirect
- No duplicate ticket or refund processing when a webhook is delivered more than once

---

# 1. Product Mission

Build a modern events discovery, booking, ticketing, media-gallery, customer-account, and administration platform for **Brothers Beats Events**.

## 1.1 Authoritative business model

The platform is the official sales and publishing platform for events that **Brothers Beats creates, owns, hosts, promotes, or directly operates**. Brothers Beats is the sole event publisher in the MVP.

The platform is **not**:

- A marketplace for external organisers
- A self-service event-listing service
- A venue-hire marketplace
- A platform where customers create organiser accounts or publish their own events
- A multi-tenant ticketing product for third parties

Brothers Beats may separately provide paid event-management services for private or commissioned occasions such as birthdays, parties, weddings, celebrations, community functions, entertainment programmes, and corporate events. These services are enquiry-led: visitors contact Brothers Beats, Brothers Beats reviews the request, and any commercial arrangement happens outside the public ticket-listing workflow unless Brothers Beats later decides to create and publish the event as its own event.

No public user or customer account may create, submit, list, edit, publish, or sell tickets for an event. Only authorised Brothers Beats admins may publish events.

Brothers Beats Events should be able to:

- Create and publish only Brothers Beats-owned or Brothers Beats-operated events
- Offer multiple ticket types and prices
- Receive online bookings and payments
- Create manual or complimentary bookings from the admin portal
- Monitor reservations, payments, attendees, and ticket inventory
- See the customers who purchased tickets
- Cancel bookings
- Issue full or partial refunds
- Cancel an entire event and communicate with affected attendees
- Send booking confirmations and digital tickets by email
- Send automatic reminders to ticket holders
- Send promotional event announcements to opted-in subscribers
- Publish and manage a media gallery of Brothers Beats event photos and approved YouTube videos
- Receive and manage paid event-service enquiries for birthdays, parties, weddings, corporate events, and similar occasions
- Export bookings and attendee information
- View reliable sales and attendance reporting

Customers should be able to:

- Browse all public events published by Brothers Beats
- Search and filter events
- View event information and available ticket types
- Book and pay for tickets
- Receive booking confirmation and ticket emails
- Sign in with Google
- Sign in with email and password
- Reset their password and verify their email
- View upcoming, past, cancelled, and refunded bookings
- Open or download their digital tickets
- Resend ticket emails
- Browse the Brothers Beats event photo and video gallery
- Submit an enquiry for paid private-event management services
- Manage their event-marketing subscription preferences

This is not a brochure website. It is a lightweight but complete first-party ticketing and media platform for Brothers Beats. The paid event-management service is a contact-led secondary offering and must never be presented as third-party event hosting or self-service event publishing.

---

# 2. Confirmed Technology Direction

## 2.1 Frontend

Use:

- **Next.js with the App Router**
- React
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod
- TanStack Query
- Accessible reusable components
- Vercel hosting

Use server rendering or static generation for public event pages where practical so events are discoverable, shareable, and search-engine friendly.

## 2.2 Backend

Use:

- Node.js
- TypeScript
- AWS Lambda
- Amazon API Gateway HTTP API
- AWS SDK v3
- Zod
- Pino structured logging
- Middy or equivalent Lambda middleware

## 2.3 AWS services

Use:

- DynamoDB for operational data
- Cognito User Pools for customer and admin authentication
- Google as a federated Cognito identity provider
- S3 for event images, gallery images, and generated ticket files
- SES for transactional and marketing email
- SQS for reliable background email and ticket jobs
- EventBridge and EventBridge Scheduler for reminders and scheduled jobs
- Secrets Manager or SSM Parameter Store for secrets
- CloudWatch for logs, metrics, dashboards, and alarms
- SNS integration for SES bounce and complaint processing where required

## 2.4 Payments

Use a payment-provider abstraction.

Default provider:

- Stripe Checkout
- Stripe Payment Intents
- Stripe Refunds
- Stripe webhooks

Do not spread Stripe-specific code across handlers or domain services.

## 2.5 Infrastructure as Code

Use:

- AWS CDK with TypeScript

Organise infrastructure into logical stacks:

- Auth stack
- Data stack
- Storage stack
- API stack
- Messaging stack
- Observability stack

## 2.6 Repository model

Use a `pnpm` monorepo.

---

# 3. Product Surfaces

The platform has three primary surfaces:

1. **Public website** — Brothers Beats events, ticket sales, public media gallery, and event-service enquiries
2. **Customer account portal** — customer bookings, tickets, and preferences
3. **Admin portal** — Brothers Beats event publishing, ticketing operations, gallery management, and enquiry management

All three must be delivered in the MVP. There is no organiser portal, promoter portal, vendor portal, or third-party event-submission surface.

---

# 4. Roles and Permissions

## 4.1 Public visitor

Can:

- Browse published events
- Search and filter events
- Open event details
- Select tickets
- Browse published event photos and approved YouTube videos in the public gallery
- Submit a paid event-management enquiry to Brothers Beats
- Subscribe to event announcements
- Sign in or register
- Complete a guest booking when guest checkout is enabled
- Retrieve a booking through a secure signed link

Cannot:

- Access another buyer’s booking
- See attendee data
- See draft or private events
- Create an organiser account
- Submit, create, edit, publish, or sell tickets for an event
- Change prices or inventory

## 4.2 Registered customer

Can:

- Sign in using Google
- Sign in using email and password
- Complete checkout using saved account identity
- View bookings associated with verified account email
- View upcoming and past events
- Open, download, and resend tickets
- View cancelled and refunded bookings
- Update basic profile details
- Manage marketing preferences
- Claim a prior guest booking after proving ownership of the buyer email

Cannot:

- Cancel a booking or ticket
- Request or initiate a refund from the customer portal
- Transfer, resell, gift, or reassign a booking or ticket to another person
- Change the buyer identity, booking owner, attendee identity, or ticket holder after purchase
- Change ticket type, quantity, or event after purchase

All cancellation and refund decisions are admin-controlled. Customers may contact Brothers Beats support, but this must create only a support enquiry and must never automatically alter a booking, ticket, attendee, payment, refund, or inventory record.

## 4.3 Admin

Can:

- Use the admin dashboard
- Create, edit, duplicate, publish, unpublish, pause sales for, complete, and cancel Brothers Beats events
- Upload event images
- Create, edit, publish, unpublish, reorder, and archive gallery photos and YouTube video entries
- View and manage event-service enquiries
- Create and manage ticket tiers
- View inventory
- View reservations and bookings
- Search buyers and attendees
- Create manual, complimentary, cash, or bank-transfer bookings
- Resend confirmation and ticket emails
- Cancel bookings
- Issue eligible refunds
- Export bookings and attendees
- Send or schedule event communications
- View campaign results
- View audit history

## 4.4 Super admin

Can additionally:

- Invite, disable, and manage admin users
- Assign admin roles
- Configure Brothers Beats organisation settings
- Configure brand, payment, email, reminder, refund, gallery, and enquiry defaults
- View all audit events
- Manage feature flags and environment-level settings exposed through the product

## 4.5 Authorization model

Use Cognito groups:

```text
CUSTOMER
ADMIN
SUPER_ADMIN
```

Rules:

- Public APIs expose only published and publicly visible Brothers Beats event and gallery data.
- No public or customer API may create or publish events.
- Customer APIs require a valid customer JWT.
- Admin APIs require `ADMIN` or `SUPER_ADMIN`.
- Super-admin-only endpoints require `SUPER_ADMIN`.
- Frontend route protection is not sufficient; authorization must be enforced by the API.
- Admin users should be required to use MFA in production.
- Customer MFA may be optional.

---

# 5. Core User Journeys

## 5.1 Admin creates and publishes an event

1. Admin signs in.
2. Admin opens **Events → Create event**.
3. Admin completes:
   - Basic details
   - Date and time
   - Venue
   - Images
   - Ticket types
   - Policies
   - SEO and social sharing
4. Event is saved as `DRAFT`.
5. Admin previews the public event page.
6. Publish validation runs.
7. Admin publishes the event.
8. Event becomes visible in public search and listing pages.
9. Audit entry records the action.

## 5.2 Customer books a ticket

1. Customer browses events.
2. Customer opens an event page.
3. Customer selects ticket type and quantity.
4. Backend returns a validated price quote.
5. Customer enters buyer and attendee details.
6. Backend reserves inventory for a fixed period.
7. Backend creates Stripe Checkout.
8. Customer pays.
9. Verified Stripe webhook confirms payment.
10. Backend atomically converts reserved inventory into sold inventory.
11. Booking becomes `CONFIRMED`.
12. Ticket records and QR codes are generated.
13. Confirmation and ticket email is sent.
14. Booking appears in the customer account when the email matches a verified account.
15. Admin dashboard and booking list update from real data.

## 5.3 Customer views tickets

1. Customer signs in using Google or email and password.
2. Customer opens **My tickets**.
3. Customer sees:
   - Upcoming bookings
   - Past bookings
   - Cancelled bookings
   - Refunded bookings
4. Customer opens a booking.
5. Customer can:
   - View ticket QR codes
   - Download ticket PDF
   - Resend ticket email
   - View event directions and policies

## 5.4 Admin cancels and refunds a booking

1. Admin opens a confirmed booking.
2. System shows:
   - Original amount
   - Amount already refunded
   - Maximum refundable amount
   - Refund policy
   - Ticket status
3. Admin selects:
   - Full refund, or
   - Partial refund by amount or selected tickets
4. Admin enters a mandatory reason.
5. System shows a final confirmation dialog.
6. Backend validates eligibility.
7. Backend creates the provider refund using an idempotency key.
8. Booking becomes `REFUND_PENDING`.
9. Verified refund webhook changes the booking to:
   - `PARTIALLY_REFUNDED`, or
   - `REFUNDED`
10. Refunded tickets become invalid.
11. Inventory is restored when configured and when the event is still active.
12. Refund email is sent.
13. Audit log records actor, reason, amount, provider reference, and timestamps.

## 5.5 Admin cancels an event

1. Admin selects **Cancel event**.
2. Admin enters:
   - Cancellation reason
   - Customer-facing message
   - Whether refunds should be issued
3. System shows confirmed booking count and estimated refund total.
4. Admin confirms cancellation.
5. Event becomes `CANCELLED`.
6. Ticket sales stop immediately.
7. Background workflow:
   - Sends event cancellation emails
   - Creates refund jobs when selected
   - Tracks failures for retry
8. Admin can monitor cancellation communication and refund progress.

## 5.6 Brothers Beats sends event reminders

Two distinct communication types must exist:

### Transactional attendee reminders

Sent to confirmed ticket holders regardless of marketing subscription where legally appropriate for servicing the booking.

Examples:

- Booking confirmation
- Ticket delivery
- Event updated
- Event reminder
- Event cancelled
- Refund processed

### Marketing communications

Sent only to users with active marketing consent.

Examples:

- New event announcement
- Featured events
- Upcoming weekend events
- Category-based campaign

Each marketing email must include an unsubscribe link.

---

## 5.7 Admin publishes gallery media

1. Admin signs in.
2. Admin opens **Gallery → Add media**.
3. Admin chooses either:
   - Event photo upload, or
   - YouTube video link
4. For a photo, the admin uploads an approved image and provides title, alt text, caption, optional related event, and display order.
5. For a YouTube video, the admin pastes a valid `youtube.com` or `youtu.be` URL and provides title, caption, optional related event, and display order.
6. The backend validates and normalises the media record. It stores only the YouTube video ID and canonical URL; it never stores arbitrary iframe or script HTML.
7. Admin previews the item.
8. Admin publishes it.
9. The item appears in the public gallery and, when linked, may appear on the related event page.
10. Audit history records create, update, publish, unpublish, reorder, and archive actions.

## 5.8 Visitor requests paid event-management services

1. Visitor opens **Services** or **Contact**.
2. The page explains that Brothers Beats sells tickets only for its own events but can manage private or commissioned events for a fee.
3. Visitor submits event type, contact details, preferred date, location, estimated guests, budget range when provided, and a message.
4. The backend validates, rate-limits, stores, and emails the enquiry to Brothers Beats.
5. The visitor receives a generic success response and optional confirmation email.
6. Admin reviews the enquiry and updates its internal status.
7. Submitting an enquiry must not create a public event, organiser account, ticket tier, booking, invoice, or payment automatically.

---

# 6. Public Website Requirements

## 6.1 Required routes

```text
/
/events
/events/[slug]
/gallery
/checkout/[eventId]
/booking/confirmation
/booking/lookup
/auth/sign-in
/auth/sign-up
/auth/forgot-password
/auth/reset-password
/auth/verify-email
/about
/services
/contact
/privacy
/terms
/refund-policy
/unsubscribe
```

## 6.2 Home page

Required sections:

1. Header with logo, navigation, search, account action, and event CTA
2. Hero section
3. Search by keyword, category, city, and date
4. Featured upcoming events
5. Browse by category
6. Event collection or “This weekend” section
7. Event memories gallery preview with published photos and YouTube videos
8. Why Brothers Beats Events
9. Paid event-management services:
   - Birthdays & Private Parties
   - Weddings & Celebrations
   - Corporate Events
   - Community and Cultural Events
   - Entertainment & Live Shows
10. Clear explanation that these services are handled by Brothers Beats on enquiry and payment, not through customer event listings
11. Email subscription CTA
12. Contact or event-planning CTA
13. Footer

Hero copy may use:

```text
Fresh Events. Vibrant Energy.
Discover memorable events created by Brothers Beats.
```

Primary CTA:

```text
Explore Events
```

Secondary CTA:

```text
Plan a Private Event With Us
```

Never use “List Your Event”, “Sell Tickets”, “Become an Organiser”, “Create Your Event”, or equivalent third-party marketplace language. The public event catalogue contains only events published by Brothers Beats. The service CTA must lead to an enquiry form, not to an event-creation flow.

## 6.3 Events listing

Must include:

- Search by event name, venue, city, or keyword
- Category filter
- Date filter
- City filter
- Availability filter
- Sort by:
  - Soonest
  - Recently added
  - Price
- Pagination or cursor-based loading
- Responsive event cards
- Empty state
- Loading skeleton
- Error state
- Clear filters action

Event cards must show:

- Image
- Event title
- Date
- Time
- Venue or city
- Starting price
- Availability badge
- Category
- Favourite or save control only if implemented fully

Badges:

```text
EARLY BIRD
SELLING FAST
SOLD OUT
COMING SOON
CANCELLED
```

Do not calculate “selling fast” in the browser. Use a backend-derived value.

## 6.4 Event detail page

Must include:

- Event hero image
- Event title
- Event date and time
- Event timezone
- Venue and address
- Map link
- Event description
- Event-specific gallery containing only published media linked by an admin
- Safe embedded YouTube videos when published for that event
- Ticket tiers
- Quantity selection
- Price summary
- Availability state
- Refund policy
- Terms
- Contact/support information
- Social sharing metadata
- Share controls
- Related events
- Mobile sticky booking CTA

Public pages must never expose internal notes, private attendee data, payment-provider IDs, unpublished ticket tiers, or admin metadata.

## 6.5 Checkout

Checkout must collect:

- Buyer full name
- Buyer email
- Buyer phone, configurable
- Ticket quantity
- Attendee names, when event configuration requires them
- Acceptance of terms and refund policy
- Optional marketing consent checkbox that is not preselected

Checkout must show:

- Event
- Ticket type
- Quantity
- Unit price
- Fees
- Total
- Currency
- Reservation expiry countdown
- Refund summary
- Secure payment message

The backend must create the authoritative quote and checkout session.

## 6.6 Booking confirmation

The confirmation page must not trust payment success query parameters.

It must request booking state from the backend using a signed booking token or authenticated account.

States:

- Payment processing
- Confirmed
- Failed
- Expired
- Review required

Confirmed state must show:

- Booking reference
- Event summary
- Ticket quantity
- Buyer email
- Ticket access action
- Account creation/sign-in prompt for guest customers

## 6.7 Booking lookup and resend

Allow a customer to request a secure booking link by providing:

- Buyer email
- Booking reference

Do not reveal whether arbitrary email addresses have bookings.

Return a generic response:

```text
If the details match a booking, we will send a secure link.
```

Secure links must:

- Be signed
- Expire
- Be single-purpose
- Avoid exposing raw personal data

---

## 6.8 Public gallery

The `/gallery` page is a public showcase of Brothers Beats event memories and promotional media. It is not a user-upload area.

Must include:

- Published photo cards
- Published YouTube video cards with embedded playback
- Filter by related event, year, or media type where useful
- Featured media section
- Responsive masonry or balanced grid that remains accessible
- Image lightbox or detail dialog with keyboard controls when implemented
- Video title and caption outside the iframe
- Loading, empty, and error states
- Pagination or cursor-based loading
- SEO metadata and shareable URLs where practical

Photo requirements:

- Images are uploaded only by admins
- Every published image requires meaningful alt text unless explicitly marked decorative
- Store optimised variants and preserve the original within the configured retention policy
- Use responsive image delivery and lazy loading

YouTube requirements:

- Accept only valid `youtube.com`, `www.youtube.com`, `m.youtube.com`, or `youtu.be` URLs
- Extract and store a validated YouTube video ID
- Render through a controlled reusable component using a privacy-enhanced YouTube embed where practical
- Never render admin-supplied iframe HTML, scripts, or arbitrary embed code
- Use a restrictive iframe `allow` list, descriptive `title`, lazy loading, and fullscreen support
- Reject playlists, channels, shorts, live links, or other URL formats unless explicitly supported and tested
- Show a clear unavailable state when a video is removed or cannot load

Only `PUBLISHED` gallery items are visible publicly. Draft, unpublished, and archived items must never appear in public responses.

## 6.9 Paid event-management services and contact

The `/services` and `/contact` pages must clearly distinguish the two offerings:

1. **Ticketed public events:** created, hosted, operated, and sold by Brothers Beats through this platform.
2. **Paid private-event management:** Brothers Beats may manage a birthday, private party, wedding, celebration, community event, entertainment programme, or corporate event after direct enquiry and commercial agreement.

The services page must not imply that Brothers Beats offers a self-service hosting platform to other organisers.

The event-management enquiry form should support:

- Event type
- Full name
- Email
- Phone
- Preferred date or date range
- Venue or city
- Estimated guest count
- Indicative budget range, optional
- Description and requirements
- Consent to be contacted

The form must use backend validation, rate limiting, anti-bot protection where practical, persistent storage, admin notification, and a generic success response. It must not create a public event or take payment automatically.

---

# 7. Customer Account Portal

## 7.1 Required routes

```text
/account
/account/tickets
/account/tickets/[bookingReference]
/account/events
/account/profile
/account/preferences
```

## 7.2 Customer dashboard

Show:

- Next upcoming event
- Upcoming ticket count
- Recent booking
- Recommended or featured events
- Subscription status

## 7.3 My tickets

Provide tabs or filters:

```text
UPCOMING
PAST
CANCELLED
REFUNDED
ALL
```

Each booking card should show:

- Event name
- Event date
- Venue
- Number of tickets
- Booking status
- Payment status
- Booking reference

## 7.4 Ticket detail

Must show:

- Event details
- Individual tickets
- QR code per ticket
- Attendee name when collected
- Ticket status
- Download PDF action
- Resend email action
- Add-to-calendar link
- Support contact
- Refund/cancellation policy

## 7.5 Customer ticket restrictions

Tickets sold through Brothers Beats Events are non-transferable through the platform.

The customer portal must not provide controls, endpoints, hidden actions, or URL-accessible mutations for:

- Cancelling a booking
- Cancelling an individual ticket
- Requesting or initiating a refund
- Transferring a booking
- Transferring an individual ticket
- Reselling or gifting a ticket
- Reassigning a ticket to another customer account
- Changing the buyer email or booking owner
- Changing attendee names after confirmation
- Moving a ticket to another event, date, or ticket tier

The only customer-facing actions on a confirmed ticket are:

- View ticket
- Download ticket
- Resend ticket email
- Add event to calendar
- View event details, policies, and support contact information

A customer may submit a general support enquiry. The enquiry must not automatically cancel, refund, transfer, rename, or modify the booking.

Only an authenticated admin may cancel a booking or issue a refund. Ticket transfer and resale are not supported in the MVP, including through admin APIs. An admin may correct an obvious spelling error in attendee information only where business policy permits; this must be audited and must not change booking ownership.

## 7.5 Account matching and guest-booking claim

When a guest later creates or signs in to an account:

- Match bookings only after the user’s email is verified.
- Attach eligible historical bookings by normalized verified email.
- Record account-linking activity.
- Never allow a logged-in user to claim a booking using an unverified email.

## 7.6 Profile and preferences

Allow customers to manage:

- Full name
- Phone
- Marketing subscription
- Event category preferences, optional
- City preference, optional

Authentication identity fields should be managed through Cognito.

---

# 8. Admin Portal

## 8.1 Required routes

```text
/admin/login
/admin
/admin/events
/admin/events/new
/admin/events/[eventId]
/admin/events/[eventId]/preview
/admin/events/[eventId]/tickets
/admin/events/[eventId]/bookings
/admin/events/[eventId]/attendees
/admin/gallery
/admin/gallery/new
/admin/gallery/[mediaId]
/admin/enquiries
/admin/enquiries/[enquiryId]
/admin/bookings
/admin/bookings/[bookingId]
/admin/customers
/admin/subscribers
/admin/communications
/admin/communications/new
/admin/refunds
/admin/reports
/admin/settings
/admin/admin-users
/admin/audit-log
```

Routes must be role-protected.

## 8.2 Dashboard

Use real API data.

Required metrics:

- Upcoming events
- Published events
- Draft events
- Total confirmed bookings
- Tickets sold
- Active reservations
- Gross sales
- Refund total
- Net sales
- Subscriber count
- Published gallery items
- New event-service enquiries
- Recent bookings
- Events close to capacity
- Failed email or webhook jobs requiring attention

Filters:

- Date range
- Event
- Booking status

Do not show a chart unless it is connected to real aggregation data.

## 8.3 Event management

Admin must be able to:

- Create
- Save draft
- Edit
- Preview
- Duplicate
- Publish
- Unpublish
- Pause sales
- Resume sales
- Mark sold out
- Cancel
- Mark completed
- Archive when appropriate

Event form sections:

1. Basic information
2. Date and time
3. Venue
4. Media
5. Ticket types
6. Capacity and booking rules
7. Buyer and attendee information
8. Policies
9. SEO and social
10. Publishing

Publish validation must show all missing or invalid fields together.

## 8.4 Media gallery management

Admin must have a dedicated gallery workspace independent of the event form.

Admin can:

- Upload event photos
- Add approved YouTube video links
- Edit title, caption, alt text, related event, featured state, and display order
- Preview media before publishing
- Publish and unpublish items
- Reorder items
- Filter by media type, event, status, and date
- Archive items
- Open the related public event or gallery view
- See audit history

Photo workflow:

- Use presigned S3 uploads
- Validate MIME type, extension, file size, and image dimensions
- Require alt text before publication unless explicitly decorative
- Generate or serve responsive variants
- Prevent public access to draft media through predictable object paths

YouTube workflow:

- Accept a URL, not iframe HTML
- Validate the hostname and supported URL shape
- Extract a canonical video ID server-side
- Store canonical URL and video ID
- Generate a preview using the controlled embed component
- Reject malformed, unsupported, or non-YouTube URLs

Deleting a published or referenced item requires confirmation. Prefer archiving when the item has historical references.

## 8.5 Event-service enquiry management

Admin can:

- View new paid event-management enquiries
- Search by name, email, phone, event type, city, or preferred date
- Filter by status
- Open enquiry details
- Add internal notes
- Assign an owner when enabled
- Update status to `NEW`, `CONTACTED`, `QUALIFIED`, `CLOSED`, or `SPAM`
- Export filtered enquiries when authorised

An enquiry is not an event, booking, customer ticket, or payment record. Converting an accepted enquiry into a Brothers Beats public event requires an admin to create a separate event through the normal event workflow.

## 8.6 Ticket-tier management

Admin can create:

- Early Bird
- Standard
- Group
- VIP
- Complimentary
- Custom ticket types

Each tier supports:

- Name
- Description
- Price in minor units
- Currency
- Sales start
- Sales end
- Quantity limit
- Quantity sold
- Quantity reserved
- Minimum per order
- Maximum per order
- Visibility
- Active state
- Sort order

Admin must see:

```text
Available = Maximum quantity - Sold - Reserved
```

Changing a tier must not retroactively change confirmed booking amounts.

## 8.7 Booking and reservation management

Admin booking list must support:

- Search by booking reference
- Search by buyer name
- Search by buyer email
- Search by attendee
- Filter by event
- Filter by booking status
- Filter by payment status
- Filter by ticket type
- Filter by date
- Export filtered results

Booking detail must show:

- Buyer
- Attendees
- Event
- Ticket tier
- Quantity
- Amounts
- Fees
- Payment status
- Booking status
- Reservation expiry
- Provider identifiers
- Email history
- Ticket records
- Refund history
- Audit history

Admin actions:

- Resend confirmation
- Resend tickets
- Add internal note
- Cancel unpaid reservation
- Cancel confirmed booking
- Issue refund
- Download invoice or receipt when available
- Open customer profile
- Create manual booking

## 8.8 Manual bookings

Admin can create:

- Complimentary booking
- Cash booking
- Bank transfer booking
- External payment booking

Required controls:

- Inventory validation
- Payment method
- Payment status
- Buyer information
- Attendee information
- Internal note
- Whether to send ticket email
- Audit log

Manual bookings must use the same ticket and inventory system as online bookings.

## 8.9 Attendee management

Per-event attendee view must support:

- Search
- Ticket status
- Ticket type
- Buyer
- Attendee name
- Email
- Check-in status placeholder for future use
- CSV export

CSV export must be authorized and generated securely.

## 8.10 Customer management

Admin can view:

- Customer name
- Verified email
- Phone
- Booking count
- Ticket count
- Upcoming bookings
- Lifetime spend
- Refund total
- Marketing subscription state
- Last activity

Do not allow admins to view customer passwords or authentication secrets.

## 8.11 Refund management

Admin refund list must show:

- Refund reference
- Booking
- Event
- Customer
- Amount
- Currency
- Reason
- Status
- Provider refund ID
- Requested by
- Requested at
- Completed at
- Failure details

Statuses:

```text
REQUESTED
PROCESSING
SUCCEEDED
FAILED
CANCELLED
```

Failed refunds must be visible and retryable only when safe.

## 8.12 Communications

Admin can:

- Create campaign
- Select audience
- Preview email
- Send test email
- Send now
- Schedule
- Cancel a scheduled campaign
- View delivery summary

Audience options:

- All active subscribers
- Confirmed attendees of a selected event
- Customers who attended a prior event
- Subscribers interested in selected categories
- Subscribers in a selected city, when profile data exists

Campaign content:

- Subject
- Preheader
- Heading
- Body
- CTA label
- CTA URL
- Event selection
- Hero image
- Sender name

Marketing campaigns must exclude unsubscribed, bounced, and complained addresses.

## 8.13 Audit log

Record sensitive admin actions:

- Admin sign-in
- Event creation
- Event updates
- Publishing
- Gallery media creation, update, publish, unpublish, reorder, and archive
- Event-service enquiry status changes
- Sales pause
- Event cancellation
- Booking creation
- Booking cancellation
- Refund request
- Refund completion
- Ticket resend
- Campaign creation
- Campaign send
- Admin-user changes
- Settings changes

Audit record:

```ts
interface AuditLogEntity {
  auditId: string;
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
  createdAt: string;
}
```

Audit records should be append-only.

---

# 9. Event and Ticket Requirements

## 9.1 Event fields

```ts
type EventStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'SALES_PAUSED'
  | 'SOLD_OUT'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'ARCHIVED';

type EventVisibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

interface EventEntity {
  eventId: string;
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
  galleryImageUrls?: string[]; // optional denormalised legacy/event-form list; public gallery uses GalleryMediaEntity
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
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  cancelledAt?: string;
}
```

Default timezone:

```text
Europe/Dublin
```

Default currency:

```text
EUR
```

## 9.2 Ticket-tier fields

```ts
type TicketTierType =
  | 'EARLY_BIRD'
  | 'STANDARD'
  | 'GROUP'
  | 'VIP'
  | 'COMPLIMENTARY'
  | 'CUSTOM';

interface TicketTierEntity {
  eventId: string;
  ticketTierId: string;
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

  visible: boolean;
  active: boolean;
  sortOrder: number;

  createdAt: string;
  updatedAt: string;
}
```

## 9.3 Pricing rules

The backend is the source of truth.

Rules:

1. The event must be bookable.
2. The tier must be active and visible.
3. Current time must be inside the sales window.
4. Requested quantity must satisfy tier minimum and maximum.
5. Requested quantity must satisfy event per-order limit.
6. Tier inventory must be available.
7. Event inventory must be available.
8. Group pricing must require the configured minimum group size.
9. Early Bird pricing must stop after its time or quantity limit.
10. Confirmed booking prices are immutable.
11. Money must be stored and calculated in minor units.
12. The frontend must render the backend quote; it must not calculate the payable amount independently.

Quote response:

```ts
interface PriceQuote {
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
```

---

## 9.4 Gallery media fields

```ts
type GalleryMediaType = 'IMAGE' | 'YOUTUBE_VIDEO';
type GalleryMediaStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

interface GalleryMediaEntity {
  mediaId: string;
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
  createdAt: string;
  updatedAt: string;
}
```

Rules:

1. `IMAGE` requires an approved S3 image key and alt text before publication unless marked decorative.
2. `YOUTUBE_VIDEO` requires a validated canonical YouTube URL and video ID.
3. A media record must never store arbitrary HTML, iframe markup, JavaScript, or untrusted embed code.
4. `eventId` is optional so the gallery may contain general Brothers Beats media as well as event-specific media.
5. Only `PUBLISHED` records are returned by public APIs.
6. Public ordering is backend-controlled by featured state, sort order, and publication date.
7. An archived item is not publicly visible and cannot be newly linked to an event.
8. Event deletion or archival must not silently delete gallery history; related records should be preserved or explicitly reassigned.

## 9.5 Event-service enquiry fields

```ts
type EventServiceEnquiryStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'CLOSED'
  | 'SPAM';

type EventServiceType =
  | 'BIRTHDAY'
  | 'PRIVATE_PARTY'
  | 'WEDDING'
  | 'CORPORATE'
  | 'COMMUNITY'
  | 'ENTERTAINMENT'
  | 'OTHER';

interface EventServiceEnquiryEntity {
  enquiryId: string;
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

  createdAt: string;
  updatedAt: string;
}
```

An event-service enquiry is informational and sales-operational only. It must not automatically create a public event, ticket inventory, checkout session, booking, payment, or customer account.

---

# 10. Reservation, Inventory, and Overselling Prevention

## 10.1 Reservation strategy

Reserve inventory before redirecting to Stripe.

Default reservation window:

```text
15 minutes
```

At checkout creation:

1. Validate event and tier.
2. Validate quote.
3. Use a DynamoDB transaction.
4. Increment:
   - Event `totalTicketsReserved`
   - Tier `quantityReserved`
5. Create booking in `RESERVED_PENDING_PAYMENT`.
6. Store `reservedUntil`.
7. Create Stripe Checkout session.
8. Return checkout URL and expiry.

On payment success:

1. Verify webhook.
2. Confirm webhook was not processed previously.
3. Use a transaction to:
   - Ensure booking is still eligible
   - Decrement event reserved count
   - Increment event sold count
   - Decrement tier reserved count
   - Increment tier sold count
   - Set booking to `CONFIRMED`
   - Create ticket records or enqueue ticket generation
4. Send confirmation email asynchronously.

On expiry:

1. EventBridge Scheduler or scheduled Lambda finds expired reservations.
2. Transaction releases reserved inventory.
3. Booking becomes `EXPIRED`.
4. Stripe Checkout session may be expired where supported.

## 10.2 Availability formula

```text
Event available =
event capacity
- total tickets sold
- total tickets reserved

Tier available =
tier maximum quantity
- tier quantity sold
- tier quantity reserved
```

## 10.3 Payment after reservation expiry

If a late provider webhook reports successful payment after reservation was released:

- Do not silently oversell.
- Set booking to `PAYMENT_REVIEW_REQUIRED`.
- Alert the admin.
- Attempt a safe automatic refund when configured.
- Record the outcome.
- Notify the buyer only after the final state is known.

## 10.4 Concurrency requirements

Use DynamoDB transactions and condition expressions.

Test concurrent checkout attempts to prove that inventory cannot become negative or exceed capacity.

---

# 11. Booking, Payment, and Refund State Models

## 11.1 Booking statuses

```text
RESERVED_PENDING_PAYMENT
CONFIRMED
PAYMENT_FAILED
EXPIRED
PAYMENT_REVIEW_REQUIRED
CANCELLED
REFUND_PENDING
PARTIALLY_REFUNDED
REFUNDED
```

## 11.2 Payment statuses

```text
NOT_REQUIRED
PENDING
SUCCEEDED
FAILED
PARTIALLY_REFUNDED
REFUNDED
```

## 11.3 Ticket statuses

```text
VALID
CHECKED_IN
CANCELLED
REFUNDED
```

## 11.4 Booking entity

```ts
interface BookingEntity {
  bookingId: string;
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

  attendees: Array<{
    attendeeId: string;
    name?: string;
    email?: string;
  }>;

  source: 'ONLINE' | 'ADMIN_MANUAL';
  paymentMethod:
    | 'STRIPE'
    | 'CASH'
    | 'BANK_TRANSFER'
    | 'COMPLIMENTARY'
    | 'EXTERNAL';

  paymentProvider?: 'STRIPE';
  paymentProviderSessionId?: string;
  paymentProviderPaymentIntentId?: string;
  paymentProviderCustomerId?: string;

  reservedUntil?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;

  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 11.5 Refund entity

```ts
interface RefundEntity {
  refundId: string;
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
  updatedAt: string;
}
```

## 11.6 Refund rules

1. Refunded amount cannot exceed captured amount minus prior successful refunds.
2. A refund reason is mandatory.
3. A refund request requires an idempotency key.
4. Only confirmed or partially refunded paid bookings are refundable.
5. Complimentary bookings can be cancelled but do not require a payment refund.
6. Tickets selected for refund become invalid only after the refund succeeds.
7. Full successful refund sets booking to `REFUNDED`.
8. Partial successful refund sets booking to `PARTIALLY_REFUNDED`.
9. Full refund should cancel all remaining valid tickets.
10. Inventory restoration is controlled by the event setting and event state.
11. Refund status is finalized by verified provider webhook or verified provider API reconciliation.
12. Refund actions must be audited.

---

# 12. Authentication

## 12.1 Customer authentication

Cognito must support:

- Google sign-in
- Email and password registration
- Email verification
- Sign-in
- Sign-out
- Forgot password
- Reset password
- Account linking where safe
- Token refresh
- Session expiry handling

Use email as the login username for password-based accounts.

## 12.2 Google sign-in

Configure Google as a Cognito federation provider.

Required behaviour:

- Map verified Google email
- Avoid duplicate customer profiles
- Link to existing eligible account only using a safe verified-email flow
- Preserve booking access after account linking

## 12.3 Admin authentication

Admin accounts use Cognito and admin groups.

Production rules:

- MFA required for admins
- Strong password policy
- Shorter admin session lifetime
- No public self-registration into admin groups
- Admin invitations controlled by a super admin

## 12.4 Account security

- Store no passwords in DynamoDB.
- Never log tokens.
- Use secure, HTTP-only cookies where appropriate.
- Protect against CSRF for cookie-authenticated mutations.
- Use strict origin and CORS configuration.
- Redirect users back to intended route after sign-in.

---

# 13. Digital Tickets

Each confirmed ticket must have a separate ticket record.

```ts
interface TicketEntity {
  ticketId: string;
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

  createdAt: string;
  updatedAt: string;
}
```

QR content:

```text
bbe_ticket:<ticketId>:<signedToken>
```

Requirements:

- Do not encode personal details.
- Sign or hash verification values.
- Generate one QR code per ticket.
- Generate a downloadable ticket PDF.
- Use short-lived signed download URLs or authorized API access.
- Refunded and cancelled tickets must no longer validate.
- Keep the data model ready for future QR check-in.

---

# 14. Email, Reminders, Subscribers, and Campaigns

## 14.1 Transactional email types

Implement:

- Account email verification
- Password reset
- Booking confirmation
- Ticket delivery
- Ticket resend
- Payment failure, when useful
- Reservation expiry, optional
- Event reminder
- Event updated
- Event cancelled
- Refund requested
- Refund completed
- Refund failed with support instructions

## 14.2 Automatic event reminders

Each event may define reminder timings.

Default:

```text
72 hours before
24 hours before
```

Reminder job must:

1. Select confirmed bookings.
2. Exclude cancelled or fully refunded bookings.
3. Avoid duplicate reminder delivery.
4. Respect event timezone.
5. Queue emails through SQS.
6. Record email-delivery status.

## 14.3 Subscriber model

```ts
interface SubscriberEntity {
  subscriberId: string;
  email: string;
  normalizedEmail: string;
  fullName?: string;
  customerUserId?: string;

  status:
    | 'SUBSCRIBED'
    | 'UNSUBSCRIBED'
    | 'BOUNCED'
    | 'COMPLAINED'
    | 'SUPPRESSED';

  categories?: EventCategory[];
  city?: string;

  source:
    | 'WEBSITE_FOOTER'
    | 'CHECKOUT'
    | 'CUSTOMER_ACCOUNT'
    | 'ADMIN_IMPORT';

  consentTextVersion: string;
  subscribedAt: string;
  unsubscribedAt?: string;
  updatedAt: string;
}
```

Requirements:

- Marketing consent must be explicit.
- Checkbox must not be preselected.
- Unsubscribe link must work without login.
- Unsubscribe must take effect immediately for future marketing sends.
- Transactional booking emails are managed separately.
- Process SES bounces and complaints into the suppression state.
- Do not send marketing email to suppressed addresses.

## 14.4 Campaign model

```ts
interface CampaignEntity {
  campaignId: string;
  name: string;
  subject: string;
  preheader?: string;
  content: CampaignContent;

  audienceType:
    | 'ALL_SUBSCRIBERS'
    | 'EVENT_ATTENDEES'
    | 'PAST_ATTENDEES'
    | 'CATEGORY_SUBSCRIBERS'
    | 'CITY_SUBSCRIBERS';

  audienceFilters?: Record<string, unknown>;

  status:
    | 'DRAFT'
    | 'SCHEDULED'
    | 'SENDING'
    | 'SENT'
    | 'CANCELLED'
    | 'FAILED';

  scheduledAt?: string;
  sentAt?: string;

  recipientCount?: number;
  deliveredCount?: number;
  bounceCount?: number;
  complaintCount?: number;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

## 14.5 Email architecture

```text
Domain event
   |
   v
EventBridge
   |
   v
SQS email queue
   |
   v
Email Lambda
   |
   v
SES
```

Requirements:

- Retry transient failures.
- Use a dead-letter queue.
- Prevent duplicate sends with a deduplication key.
- Record message type, recipient, booking/event, provider message ID, and status.
- Never log full email content containing sensitive customer data.

---

# 15. Data Storage

Use focused DynamoDB tables for clarity.

Required tables:

1. `EventsTable`
2. `TicketTiersTable`
3. `BookingsTable`
4. `TicketsTable`
5. `UsersTable`
6. `SubscribersTable`
7. `CampaignsTable`
8. `RefundsTable`
9. `WebhookEventsTable`
10. `EmailMessagesTable`
11. `AuditLogsTable`
12. `GalleryMediaTable`
13. `EventServiceEnquiriesTable`

Cognito remains the source of authentication identity. `UsersTable` stores application profile and preferences.

## 15.1 Required indexes

### Events

- `slug`
- `status + startDateTime`
- `category + startDateTime`
- `city + startDateTime`

### Bookings

- `eventId + createdAt`
- `normalizedBuyerEmail + createdAt`
- `customerUserId + createdAt`
- `bookingReference`
- `paymentProviderSessionId`
- `paymentProviderPaymentIntentId`
- `bookingStatus + createdAt`

### Tickets

- `bookingId`
- `eventId + createdAt`
- `qrCodeHash`

### Subscribers

- `normalizedEmail`
- `status + subscribedAt`
- `category + status`
- `city + status`

### Refunds

- `bookingId + requestedAt`
- `eventId + requestedAt`
- `status + requestedAt`
- `providerRefundId`

### Gallery media

- `status + sortOrder`
- `eventId + publishedAt`
- `type + publishedAt`
- `featured + publishedAt`

### Event-service enquiries

- `status + createdAt`
- `normalizedEmail + createdAt`
- `eventServiceType + createdAt`
- `preferredDate + createdAt`

### Webhook events

Partition by provider webhook event ID to guarantee idempotency.

---

# 15.1 Non-transferability and customer cancellation rules

These are mandatory business rules:

1. Customers cannot cancel bookings or tickets.
2. Customers cannot initiate full or partial refunds.
3. Customers cannot transfer, resell, gift, or reassign tickets.
4. Customers cannot change the booking owner, buyer email, attendee identity, event, ticket tier, or ticket quantity after payment confirmation.
5. No customer API may expose cancellation, refund, transfer, resale, reassignment, or attendee-change mutations.
6. No customer portal button, form, query parameter, hidden route, or client-side action may perform those operations.
7. Only admins may cancel bookings and issue refunds, subject to the configured policy.
8. Ticket transfer and resale are outside the product scope and must not be implemented in the admin portal either.
9. Support enquiries are informational workflows only and must not automatically mutate booking, ticket, payment, refund, attendee, or inventory data.
10. QR codes and ticket records remain linked to the original booking and cannot be moved to another account.

# 16. API Contract

Base path:

```text
/api
```

Use consistent success and error envelopes.

Error response:

```json
{
  "error": {
    "code": "INSUFFICIENT_TICKETS",
    "message": "Only 2 tickets remain for this ticket type.",
    "correlationId": "..."
  }
}
```

## 16.1 Public APIs

```http
GET    /events
GET    /events/{slug}
GET    /gallery
GET    /gallery/{mediaId}
POST   /pricing/quote
POST   /checkout/session
GET    /booking/confirmation/{token}
POST   /booking/lookup
POST   /subscribers
POST   /subscribers/unsubscribe
POST   /contact
POST   /service-enquiries
POST   /webhooks/stripe
```

## 16.2 Customer APIs

```http
GET    /me
PATCH  /me
GET    /me/bookings
GET    /me/bookings/{bookingReference}
POST   /me/bookings/{bookingReference}/resend
POST   /me/bookings/claim
GET    /me/tickets/{ticketId}/download
GET    /me/preferences
PATCH  /me/preferences
```

Do not create customer endpoints for:

```text
cancel booking
cancel ticket
request refund
create refund
transfer ticket
transfer booking
change attendee
change buyer
change booking owner
change ticket tier
change event
resell ticket
```

Any attempt to call an equivalent protected mutation must return `403 FORBIDDEN`, even when the customer owns the booking.

## 16.3 Admin event APIs

```http
GET    /admin/events
POST   /admin/events
GET    /admin/events/{eventId}
PUT    /admin/events/{eventId}
POST   /admin/events/{eventId}/duplicate
POST   /admin/events/{eventId}/publish
POST   /admin/events/{eventId}/unpublish
POST   /admin/events/{eventId}/pause-sales
POST   /admin/events/{eventId}/resume-sales
POST   /admin/events/{eventId}/cancel
POST   /admin/events/{eventId}/complete
```

## 16.4 Admin gallery and enquiry APIs

```http
GET    /admin/gallery
POST   /admin/gallery
GET    /admin/gallery/{mediaId}
PUT    /admin/gallery/{mediaId}
POST   /admin/gallery/{mediaId}/publish
POST   /admin/gallery/{mediaId}/unpublish
POST   /admin/gallery/reorder
DELETE /admin/gallery/{mediaId}

GET    /admin/service-enquiries
GET    /admin/service-enquiries/{enquiryId}
PATCH  /admin/service-enquiries/{enquiryId}
GET    /admin/service-enquiries/export
```

Gallery write endpoints require `ADMIN` or `SUPER_ADMIN`. Publication validation must reject invalid image records, missing alt text, invalid YouTube URLs, unsupported video IDs, and arbitrary embed markup.

Event-service enquiry endpoints are admin-only. Public enquiry submission must be rate-limited and return a generic success response without exposing internal status or deduplication details.

## 16.5 Admin ticket-tier APIs

```http
GET    /admin/events/{eventId}/ticket-tiers
POST   /admin/events/{eventId}/ticket-tiers
PUT    /admin/events/{eventId}/ticket-tiers/{ticketTierId}
DELETE /admin/events/{eventId}/ticket-tiers/{ticketTierId}
```

Prevent deletion when a tier has confirmed bookings. Deactivate instead.

## 16.6 Admin booking APIs

```http
GET    /admin/bookings
GET    /admin/bookings/{bookingId}
POST   /admin/bookings/manual
POST   /admin/bookings/{bookingId}/cancel
POST   /admin/bookings/{bookingId}/resend-confirmation
POST   /admin/bookings/{bookingId}/resend-tickets
GET    /admin/events/{eventId}/bookings/export
GET    /admin/events/{eventId}/attendees/export
```

## 16.7 Refund APIs

```http
GET    /admin/refunds
GET    /admin/refunds/{refundId}
POST   /admin/bookings/{bookingId}/refunds
POST   /admin/refunds/{refundId}/retry
```

## 16.8 Communications APIs

```http
GET    /admin/subscribers
GET    /admin/campaigns
POST   /admin/campaigns
GET    /admin/campaigns/{campaignId}
PUT    /admin/campaigns/{campaignId}
POST   /admin/campaigns/{campaignId}/test
POST   /admin/campaigns/{campaignId}/schedule
POST   /admin/campaigns/{campaignId}/send
POST   /admin/campaigns/{campaignId}/cancel
```

## 16.9 Admin reports and settings

```http
GET    /admin/dashboard
GET    /admin/reports/sales
GET    /admin/reports/attendance
GET    /admin/audit-log
GET    /admin/settings
PUT    /admin/settings
GET    /admin/admin-users
POST   /admin/admin-users/invite
PUT    /admin/admin-users/{userId}
```

## 16.10 Upload APIs

```http
POST   /admin/uploads/presign
```

Validate:

- Upload purpose: event hero, event media, gallery image, or ticket asset
- MIME type
- Extension
- Maximum size
- Image dimensions where required
- Upload path and object-key prefix
- Admin authorization

Allowed image types:

```text
image/jpeg
image/png
image/webp
```

Maximum file size:

```text
5 MB
```

Gallery video entries are URL records and must not use the upload endpoint. The server must validate and normalise YouTube URLs before saving them.

---

# 17. Payment Provider Abstraction

```ts
interface PaymentProvider {
  createCheckoutSession(
    input: CreateCheckoutSessionInput
  ): Promise<CreateCheckoutSessionOutput>;

  expireCheckoutSession(
    providerSessionId: string
  ): Promise<void>;

  createRefund(
    input: CreateRefundInput
  ): Promise<CreateRefundOutput>;

  getRefund(
    providerRefundId: string
  ): Promise<ProviderRefund>;

  verifyWebhook(
    input: VerifyWebhookInput
  ): Promise<VerifiedPaymentEvent>;
}
```

Stripe implementation requirements:

- Use backend-calculated amount
- Include booking ID and event ID in metadata
- Use idempotency keys
- Verify webhook signatures using raw request body
- Store webhook event before processing
- Ignore already processed event IDs
- Support checkout-completed, checkout-expired, payment-failed, refund-updated, and charge-refunded events
- Reconcile ambiguous states through provider APIs

---

# 18. Design and Brand Direction

## 18.1 Overall direction

The website should be inspired by the clarity, energy, event discovery, card layout, and conversion focus of a leading event marketplace such as Eventbrite, while remaining visually original and clearly branded as Brothers Beats Events.

Do not copy Eventbrite’s page layout, assets, typography, icons, or branding.

The chosen direction is:

- Light-first
- Warm white background
- Bold dark typography
- Clean event cards
- Strong search and discovery
- Vibrant event photography
- Orange for the primary booking action
- Irish green for brand identity and secondary interaction
- Colourful category accents
- Dark contrasting footer
- Spacious, premium, modern layout

Avoid:

- Predominantly black pages
- Excessive neon glow
- Heavy 3D effects
- Nightclub-poster styling across the entire site
- Dense gradients
- Decorative clutter
- Tiny text
- Generic stock-photo-heavy layouts

## 18.2 Colour palette

```css
:root {
  --bb-bg-main: #FFFDF8;
  --bb-bg-surface: #FFFFFF;
  --bb-bg-neutral: #F5F3EF;
  --bb-border: #E4E1DC;

  --bb-text-primary: #221D19;
  --bb-text-secondary: #615D59;
  --bb-text-muted: #77726D;

  --bb-green: #087A3E;
  --bb-green-dark: #065E31;
  --bb-lime: #CEFF58;

  --bb-orange: #FF5E30;
  --bb-orange-dark: #D94520;
  --bb-ivory: #F7F5EF;

  --bb-blue: #6C85FF;
  --bb-pink: #FEC2EB;
  --bb-red: #FB3A35;
  --bb-sage: #94AF67;
  --bb-yellow: #FFD84D;

  --bb-pale-green: #E9F6C4;
  --bb-pale-orange: #FFF0E9;
  --bb-pale-blue: #EEF1FF;
  --bb-pale-pink: #FFF0FA;
}
```

## 18.3 Brand usage

- Use the supplied Brothers Beats logo asset.
- Do not redraw or regenerate the logo without explicit instruction.
- Create a proper header lock-up and compact icon use.
- Ensure the logo remains readable on light and dark backgrounds.
- Use orange as the principal “Book now” colour.
- Use green for brand links, filters, secondary actions, and success states.
- Use category colours as accents, not as the main identity.

## 18.4 Typography

Recommended:

- Display/headings: `Space Grotesk`
- Body and UI: `Inter`

Requirements:

- Large, confident headings
- Comfortable body line height
- Clear hierarchy
- No all-caps paragraphs
- Minimum accessible text sizes
- Consistent number and currency formatting

## 18.5 Public UI components

Build reusable:

- SiteHeader
- SiteFooter
- GlobalEventSearch
- EventCard
- EventGrid
- EventFilters
- CategoryPill
- EventHero
- TicketTierCard
- TicketQuantitySelector
- PriceSummary
- CheckoutForm
- BookingStatusCard
- TicketCard
- SubscriptionForm
- GalleryGrid
- GalleryMediaCard
- GalleryLightbox
- SafeYouTubeEmbed
- EventServiceEnquiryForm
- EmptyState
- ErrorState
- LoadingSkeleton

## 18.6 Admin UI direction

Admin portal should prioritize operational clarity over decorative branding.

Use:

- Neutral light surfaces
- Clear tables
- Summary cards
- Strong filters
- Status badges
- Sticky actions where useful
- Confirmation dialogs for destructive actions
- Toasts for completed actions
- Inline validation
- Responsive drawer or sidebar navigation
- Dedicated gallery and enquiry navigation items

---

# 19. SEO and Event Discovery

Public event pages must support:

- Dynamic page title
- Meta description
- Canonical URL
- Open Graph title
- Open Graph description
- Open Graph image
- Twitter/X social metadata
- Event structured data
- Sitemap
- Robots configuration
- Clean event slugs

Event listing pages should be crawlable where useful.

The public gallery must support a dynamic page title, description, canonical URL, Open Graph image, and crawlable published media summaries. Embedded YouTube content must not prevent the surrounding page from being indexed.

Cancelled and completed events may remain available with clear status, but must not allow booking.

---

# 20. Accessibility and Responsive Behaviour

Meet a reasonable WCAG 2.1 AA target.

Required:

- Keyboard navigation
- Visible focus states
- Semantic forms
- Form labels
- Accessible dialogs
- Accessible tables
- Alt text
- Colour contrast
- Reduced-motion support
- Screen-reader status announcements
- No information conveyed by colour alone
- Mobile-first layouts
- Touch-friendly controls
- Responsive admin tables or card alternatives

Test at minimum:

```text
375 px
768 px
1024 px
1440 px
```

---

# 21. Security and Privacy Requirements

- Validate all request bodies, path parameters, and query parameters.
- Use least-privilege IAM.
- Store secrets outside source control.
- Use HTTPS everywhere.
- Configure CORS for known frontend origins.
- Use secure upload URLs.
- Validate YouTube hostnames and video IDs server-side.
- Never render arbitrary iframe HTML, scripts, or embed code supplied by an admin.
- Restrict iframe sources through Content Security Policy to the approved YouTube domains used by the controlled embed component.
- Verify all Stripe webhooks.
- Protect against webhook replay.
- Use idempotency.
- Rate-limit booking lookup, authentication-adjacent, subscription, contact, and event-service enquiry endpoints.
- Do not store card data.
- Do not put personal data in QR codes.
- Do not expose buyer lists through public APIs.
- Avoid logging sensitive personal data.
- Use field-level redaction in structured logs.
- Provide privacy, terms, refund, and cookie pages.
- Record marketing consent.
- Honour unsubscribe, bounce, and complaint suppression.
- Define data-retention and deletion procedures in documentation.
- Use anti-bot protection on public contact and subscription forms when practical.
- Use CSP and other appropriate security headers.

---

# 22. Observability and Operations

## 22.1 Structured logging

Include:

- Timestamp
- Level
- Service
- Function
- Correlation ID
- User or admin ID when safe
- Event ID
- Booking ID
- Error code

## 22.2 Metrics and alarms

Monitor:

- API 4xx and 5xx
- Lambda errors and throttles
- DynamoDB throttles
- Stripe webhook failures
- Duplicate webhook count
- Reservation cleanup failures
- Ticket-generation failures
- Email queue depth
- Dead-letter queue messages
- SES bounces and complaints
- Refund failures
- Campaign send failures
- Gallery upload or publish failures
- Event-service enquiry notification failures

## 22.3 Operational dashboards

Create CloudWatch dashboards for:

- API health
- Booking health
- Payment webhooks
- Email jobs
- Refund jobs
- Database throttling

## 22.4 Admin-visible failures

The admin dashboard should show actionable failures, such as:

- Payment requires review
- Refund failed
- Ticket generation failed
- Email failed
- Event cancellation job incomplete
- Gallery media failed validation or publication
- Event-service enquiry notification failed

---

# 23. Testing Requirements

## 23.1 Unit tests

Test:

- Event publish validation
- Ticket-tier eligibility
- Early Bird expiry
- Group minimum
- Event capacity
- Tier capacity
- Price calculation
- Reservation creation
- Reservation release
- Booking state transitions
- Webhook idempotency
- Refund eligibility
- Partial refund amount
- Subscriber suppression
- Reminder deduplication
- Gallery publication validation
- YouTube URL normalisation and allowlist rejection
- Gallery public-status filtering
- Event-service enquiry validation and rate-limit boundaries
- Authorization rules

## 23.2 Integration tests

Test:

1. Admin creates event.
2. Admin creates ticket tiers.
3. Admin publishes event.
4. Public event appears.
5. Customer receives price quote.
6. Checkout reserves inventory.
7. Stripe test webhook confirms payment.
8. Booking is confirmed.
9. Tickets are generated.
10. Email job is created.
11. Customer sees booking in account.
12. Admin sees booking and attendee.
13. Admin sends reminder.
14. Admin issues full refund.
15. Refund webhook updates status.
16. Tickets become invalid.
17. Inventory updates correctly.
18. Duplicate webhooks cause no duplicate state changes.
19. Admin uploads and publishes a gallery image.
20. Admin publishes a valid YouTube gallery item.
21. Public gallery returns only published media.
22. Public event page shows media linked to that event.
23. A visitor submits a paid event-management enquiry.
24. Admin sees and updates the enquiry without creating an event automatically.

## 23.3 Concurrency tests

Test multiple simultaneous attempts for the final remaining tickets.

Expected result:

- No overselling
- No negative inventory
- Only valid reservations are created
- Rejected users receive a clear availability error

## 23.4 Frontend tests

Test:

- Event search and filters
- Event detail rendering
- Sold-out state
- Checkout validation
- Reservation countdown
- Authentication flows
- Customer ticket list
- Admin event form
- Booking filters
- Refund confirmation
- Campaign audience selection
- Public gallery image and YouTube rendering
- Admin gallery create, preview, publish, reorder, and archive flows
- Event-service enquiry submission and admin status flow
- Accessibility of critical forms and dialogs

## 23.5 End-to-end tests

Use Playwright or equivalent for:

- Email/password registration and sign-in
- Google sign-in integration boundary, mocked where external automation is not possible
- Admin event creation
- Public booking in Stripe test mode
- Customer ticket access
- Admin refund
- Admin photo gallery publication
- Admin YouTube link publication and public playback
- Paid event-management enquiry submission
- Subscriber opt-in and unsubscribe

---

# 24. Development Seed Data

Create a development seed script with:

- One super admin
- One admin
- Two customer accounts
- Six events:
  - Published upcoming
  - Early Bird available
  - Group pricing
  - Almost sold out
  - Sold out
  - Cancelled
- Multiple ticket tiers
- Confirmed bookings
- Pending reservations
- Refunded booking
- Subscribers with different statuses
- One draft campaign
- One sent campaign
- Four published gallery images
- Two published YouTube gallery entries
- One draft gallery item
- Three event-service enquiries with different statuses

Seed data must never run automatically in production.

Document test credentials for local development only.

---

# 25. Repository Structure

```text
brothers-beats-events/
  CLAUDE.md
  README.md
  package.json
  pnpm-workspace.yaml
  .env.example
  .gitignore

  apps/
    web/
      src/
        app/
          (public)/
          (auth)/
          account/
          admin/
        components/
        features/
          events/
          checkout/
          bookings/
          tickets/
          account/
          admin/
          communications/
          gallery/
          enquiries/
          refunds/
        lib/
        styles/
        types/
        middleware.ts
      public/
        brand/
        images/

    api/
      src/
        handlers/
          public/
          customer/
          admin/
          webhooks/
          scheduled/
          workers/
        domain/
          events/
          inventory/
          pricing/
          bookings/
          payments/
          refunds/
          tickets/
          users/
          subscribers/
          campaigns/
          gallery/
          enquiries/
          email/
          audit/
        services/
          auth/
          dynamo/
          stripe/
          s3/
          ses/
          sqs/
          eventbridge/
        shared/
          errors/
          logging/
          validation/
          responses/
          security/
          env/
        tests/

  infra/
    bin/
    lib/
      auth-stack.ts
      data-stack.ts
      storage-stack.ts
      api-stack.ts
      messaging-stack.ts
      observability-stack.ts

  packages/
    shared-types/
    shared-validation/
    email-templates/
    eslint-config/
    tsconfig/
```

---

# 26. Environment Variables

## 26.1 Frontend

```text
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_BRAND_NAME=Brothers Beats Events
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
NEXT_PUBLIC_COGNITO_DOMAIN=
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=
```

## 26.2 Backend

```text
NODE_ENV=
AWS_REGION=
FRONTEND_BASE_URL=

EVENTS_TABLE_NAME=
TICKET_TIERS_TABLE_NAME=
BOOKINGS_TABLE_NAME=
TICKETS_TABLE_NAME=
USERS_TABLE_NAME=
SUBSCRIBERS_TABLE_NAME=
CAMPAIGNS_TABLE_NAME=
REFUNDS_TABLE_NAME=
WEBHOOK_EVENTS_TABLE_NAME=
EMAIL_MESSAGES_TABLE_NAME=
AUDIT_LOGS_TABLE_NAME=
GALLERY_MEDIA_TABLE_NAME=
EVENT_SERVICE_ENQUIRIES_TABLE_NAME=

ASSETS_BUCKET_NAME=
EMAIL_FROM_ADDRESS=
EMAIL_REPLY_TO_ADDRESS=

COGNITO_USER_POOL_ID=
COGNITO_CUSTOMER_CLIENT_ID=
COGNITO_ADMIN_GROUP_NAME=ADMIN
COGNITO_SUPER_ADMIN_GROUP_NAME=SUPER_ADMIN

PAYMENT_PROVIDER=STRIPE
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

TICKET_SIGNING_SECRET=
BOOKING_LINK_SIGNING_SECRET=

EMAIL_QUEUE_URL=
EMAIL_DLQ_URL=
```

Secrets must come from Secrets Manager or SSM in deployed environments.

---

# 27. Deployment and CI/CD

## 27.1 Environments

Support:

```text
dev
staging
prod
```

Each environment requires separate:

- Cognito configuration
- DynamoDB tables
- S3 bucket
- API Gateway
- Stripe webhook endpoint
- SES settings
- queues
- secrets
- alarms

## 27.2 CI pipeline

Required checks:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 27.3 Deployment documentation

README must explain:

- Local prerequisites
- Environment variables
- AWS bootstrap
- CDK deployment
- Vercel deployment
- Cognito Google configuration
- Stripe test configuration
- Stripe webhook setup
- SES verification
- Seed command
- Test command
- Production checklist
- Rollback guidance

---

# 28. Delivery Phases

Do not treat later phases as optional; all phases below are part of the requested product unless explicitly reprioritised by the client.

## Phase 1 — Foundation

- Monorepo
- Shared types
- Next.js app
- API app
- CDK
- Environments
- CI checks
- Base design system

## Phase 2 — Authentication and profiles

- Cognito
- Email/password
- Google sign-in
- Admin groups
- Customer profile
- Protected routes
- Password reset and verification

## Phase 3 — Events and public discovery

- Event model
- Admin event CRUD
- Images
- Admin media gallery
- Public photo and YouTube gallery
- Paid event-service enquiry form and admin inbox
- Ticket tiers
- Publish workflow
- Public home
- Listing
- Search and filters
- Event detail
- SEO

## Phase 4 — Booking, reservation, and payment

- Pricing quote
- Inventory reservation
- Stripe Checkout
- Webhooks
- Confirmation
- Reservation expiry
- Overselling prevention

## Phase 5 — Tickets and customer portal

- Ticket generation
- QR codes
- PDFs
- Confirmation email
- My tickets
- Booking detail
- Resend
- Guest-booking claim

## Phase 6 — Admin booking operations

- Booking list
- Reservation monitoring
- Attendees
- Manual bookings
- CSV export
- Customer view
- Dashboard metrics

## Phase 7 — Cancellation and refunds

- Booking cancellation
- Full refund
- Partial refund
- Refund status
- Refund email
- Inventory restoration
- Event cancellation
- Bulk attendee notification and refund jobs

## Phase 8 — Subscribers and communications

- Subscription forms
- Preferences
- Unsubscribe
- Campaign builder
- Audience filters
- Send test
- Send now
- Schedule
- Automatic attendee reminders
- Bounce and complaint suppression

## Phase 9 — Hardening

- Audit logs
- Security headers
- Rate limits
- Observability
- Dead-letter queues
- Failure dashboard
- Accessibility
- E2E tests
- Production documentation

---

# 29. Definition of Done

The project is not complete until all conditions below are true.

## Public website

- [ ] Homepage is complete and responsive.
- [ ] Event search and filters work against backend data.
- [ ] Event detail pages use real published-event data.
- [ ] Public copy clearly states that events are created and sold by Brothers Beats.
- [ ] No public organiser registration, event submission, or “list your event” flow exists.
- [ ] Public gallery displays real published photos and controlled YouTube embeds.
- [ ] Event-management service pages lead to a contact enquiry rather than an event-creation workflow.
- [ ] Ticket types and availability are correct.
- [ ] Checkout is connected to backend pricing and Stripe.
- [ ] Confirmation reflects verified backend state.
- [ ] Subscription and unsubscribe work.
- [ ] SEO and social metadata are implemented.
- [ ] Privacy, terms, and refund pages exist.

## Customer portal

- [ ] Google sign-in works.
- [ ] Email/password sign-up and sign-in work.
- [ ] Email verification and password reset work.
- [ ] Customers can see their bookings and tickets.
- [ ] Customers can download and resend tickets.
- [ ] Guest bookings can be securely claimed.
- [ ] Customers can manage marketing preferences.
- [ ] Customers cannot cancel a booking or ticket.
- [ ] Customers cannot initiate a refund.
- [ ] Customers cannot transfer, resell, gift, reassign, or rename a ticket holder.
- [ ] No customer cancellation, refund, or transfer mutation exists in the UI or customer API.

## Admin portal

- [ ] Admin authentication and authorization work.
- [ ] Admin can create, edit, preview, publish, pause, and cancel events.
- [ ] Admin can manage ticket tiers.
- [ ] Admin can upload, preview, publish, unpublish, reorder, and archive gallery images.
- [ ] Admin can add and safely publish validated YouTube video links.
- [ ] Admin can view and update paid event-service enquiries.
- [ ] Admin can view active reservations.
- [ ] Admin can view bookings, buyers, attendees, and payment details.
- [ ] Admin can create manual bookings.
- [ ] Admin can resend tickets.
- [ ] Admin can issue refunds.
- [ ] Admin can monitor refund progress.
- [ ] Admin can export bookings and attendees.
- [ ] Admin can create and send campaigns.
- [ ] Admin can monitor operational failures.
- [ ] Sensitive actions are audited.

## Backend and infrastructure

- [ ] Prices are calculated in the backend.
- [ ] Reservations prevent overselling.
- [ ] Duplicate webhooks are idempotent.
- [ ] Ticket generation works.
- [ ] Email queue works.
- [ ] Reminder scheduler works.
- [ ] Refund state is reliable.
- [ ] Gallery records and public filtering are persisted in backend data.
- [ ] YouTube embeds are generated from validated IDs and never arbitrary HTML.
- [ ] Event-service enquiries are persisted and notified reliably.
- [ ] Logs and alarms exist.
- [ ] IAM is least privilege.
- [ ] Secrets are outside source code.
- [ ] Dev, staging, and production are documented.

## Quality

- [ ] No production data depends on mock arrays or local storage.
- [ ] No primary CTA is disconnected.
- [ ] No language suggests that third parties can host, list, or sell events through the platform.
- [ ] No critical TODO remains.
- [ ] Lint passes.
- [ ] Type checking passes.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] End-to-end tests for the primary flows pass.
- [ ] Production build passes.
- [ ] Mobile and desktop QA are complete.

---

# 30. End-to-End Acceptance Scenario

The finished system must pass this exact demonstration:

1. A super admin signs in.
2. The super admin creates an admin user.
3. The admin signs in.
4. The admin creates an event with a hero image, venue, Early Bird, Group, and Standard tickets.
5. The admin previews and publishes the event.
6. A public visitor finds the event using search.
7. The visitor opens the event and selects tickets.
8. The backend reserves inventory and creates Stripe Checkout.
9. Stripe test payment completes.
10. Stripe webhook confirms the booking.
11. The buyer receives a booking confirmation and digital tickets.
12. The buyer creates or signs in to an account using Google or email/password.
13. The buyer sees the booking under **My tickets**.
14. The admin sees the reservation, customer, attendees, amount, and payment.
15. The admin sends a test reminder and the buyer receives it.
16. The admin issues a partial or full refund.
17. The refund is reflected after webhook confirmation.
18. Refunded tickets become invalid.
19. The customer sees the refunded state in the account.
20. Dashboard, exports, audit log, and sales totals all reflect the final state correctly.
21. The admin uploads event photos to the gallery and publishes them.
22. The admin adds a valid YouTube link, previews it, and publishes it without storing arbitrary embed HTML.
23. A visitor opens `/gallery`, views the published photos, and plays the embedded YouTube video.
24. A visitor submits a birthday or private-party management enquiry through the services page.
25. The admin sees the enquiry and updates its status; no public event or ticket inventory is created automatically.
26. The customer account contains no cancellation, refund, transfer, resale, gifting, reassignment, attendee-change, organiser, or event-publishing action.
27. Direct attempts to call an equivalent customer mutation are rejected with `403 FORBIDDEN`.
28. The complete public site contains no “List Your Event”, organiser sign-up, or third-party event publishing flow.

---

# 31. Explicitly Out of Scope for This MVP

Do not add these unless requested after the core platform is complete:

- Seat maps
- Multi-organiser marketplace
- Third-party organiser accounts
- Self-service event submissions or listings
- White-label ticketing for other promoters
- Client portals for private-event customers
- Automated quoting, contracts, invoicing, or online payment for event-management services
- Native mobile application
- Native scanning application
- Loyalty points
- Ticket transfer, resale, gifting, or reassignment
- Resale marketplace
- Customer-initiated booking cancellation or refund requests
- Complex promo-code engine
- Waitlists
- Affiliate payouts
- Advanced finance reconciliation
- Full CRM
- AI event recommendations

The data model may allow future extension, but these features must not delay the required platform.

---

# 32. Final Agent Response Requirements

When implementation is complete, the coding agent must provide:

1. Architecture summary
2. Repository tree
3. Implemented feature checklist
4. Commands to run locally
5. Deployment instructions
6. Required external credentials
7. Test results
8. Known limitations
9. Screens or routes to review, including `/gallery`, `/admin/gallery`, `/services`, and `/admin/enquiries`
10. Confirmation that no critical UI action remains mocked or disconnected
11. Confirmation that only Brothers Beats admins can create or publish events and that no third-party organiser flow exists

Do not claim completion when only the UI or repository skeleton has been produced.
