# Child tickets and mixed bookings

In Admin → Events, open the event and choose **Add ticket type → Child**. The form starts with the name “Child 0–12 yrs” and a price of €0. Set the age label, description, capacity and sales dates to suit the event. Edit updates the name, description, price, capacity and dates; Hide stops public selection. A type with sales or reservations cannot be deleted.

Every free child admission creates an individual ticket with a QR code and PDF. It counts toward event capacity, ticket totals and attendance, with its own row in sales reports. A booking containing only free tickets confirms immediately without Stripe. A booking containing paid and free tickets uses one Stripe checkout and issues all tickets after payment confirmation.

Customers and admins making manual bookings can select multiple ticket types in one booking. Public checkout enforces each type’s limits, the Group minimum, and the event’s combined per-order limit and capacity. Early Bird remains an automatic discount on Standard tickets.

After selecting tickets and clicking **Next**, signed-out visitors can **Sign in**, **Sign up**, or **Continue as guest** when the event permits guest checkout. The selected ticket types and quantities stay in the checkout URL through sign-in, account verification, Google sign-in, and password reset. Signed-in customers proceed directly to their booking details.

Event details use uncached availability. The ticket selector refreshes counts every 30 seconds while visible, when visitors return to the tab, and after a failed price check. Counts respect both ticket-type and event capacity. If another booking reduces stock, the selector retains the visitor's selection and shows the current count so they can adjust it.

Online, free, and manual bookings send one confirmation email after tickets are generated. It includes the booking summary, every ticket number and type, and a **View & Download Tickets** link. There is no separate automatic ticket-delivery email. Requested resends still send one email per request; resending a confirmation includes its tickets.

The pricing and checkout endpoints accept `items: [{ ticketTierId, quantity }]`. Admin manual bookings accept the same shape. Existing requests with `ticketTierId` and `quantity`, and stored bookings without `lineItems`, remain supported. Prices are always calculated by the backend.

Run `npm test --prefix backend` for the regression suite. Stripe, email and S3 calls in the integration tests are mocked; tests do not make real payments or send emails.

## Discount and referral codes

In **Admin → Discount codes**, select an event, choose 5%, 10%, a custom percentage (up to 100%), or a fixed amount per ticket. Leave the code blank to generate one, or enter your own shareable code. Optionally select specific ticket types and an expiry date. Leaving all ticket types unchecked includes all types in that event. Existing codes can be enabled or disabled; create a new code to change its discount or scope.

Customers select **I have a discount or referral code** at checkout and click **Apply** to see the savings and updated total before payment. They can remove the code to return to regular pricing. Codes ignore letter case and surrounding spaces, and one code applies per booking. They can be shared with multiple customers and have no redemption limit or referral payout.

Discounts apply to each eligible ticket's current price, including its automatic Early Bird price. Percentage savings are rounded to the nearest minor currency unit per ticket. Fixed discounts are capped at each ticket's price, so free tickets stay free. A fully discounted booking confirms immediately and issues tickets without Stripe. Bookings retain the code, savings and discounted line amounts; sales reports and refunds use the amount actually charged.

`POST /api/admin/discount-codes` accepts `eventId`, optional `code`, optional `ticketTierIds` (an empty array means all), `discountType` (`PERCENTAGE` or `FIXED`), `value`, and optional ISO `expiresAt`. Percentage values allow two decimals; fixed values are integer minor currency units (500 means €5 for EUR tickets). `GET /api/admin/discount-codes` lists codes; `PATCH /api/admin/discount-codes/:code` accepts `{ active: boolean }`. These routes require admin authentication and record changes in the audit log. Codes are stored in the existing DynamoDB table, with an atomic uniqueness check and no table migration.

Both `POST /api/pricing/quote` and `POST /api/checkout/session` accept optional `discountCode`. Checkout revalidates eligibility, expiry and availability and recalculates all prices on the server before reserving inventory. Quotes expose `discountCode`, `discountAmountMinor`, the original subtotal and discounted total. Invalid, expired, disabled, wrong-event or non-applicable codes return a validation error.
