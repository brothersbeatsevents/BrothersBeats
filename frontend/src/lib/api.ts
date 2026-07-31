const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface FetchOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`);
  }
  return data;
}

// ── Public: Events ──

export async function getEvents(params?: {
  category?: string;
  city?: string;
  q?: string;
  sort?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.city) qs.set('city', params.city);
  if (params?.q) qs.set('q', params.q);
  if (params?.sort) qs.set('sort', params.sort);
  const query = qs.toString();
  return apiFetch<{ success: boolean; data: any[] }>(`/events${query ? `?${query}` : ''}`);
}

export async function getEvent(slug: string) {
  return apiFetch<{ success: boolean; data: any }>(`/events/${slug}`);
}

// ── Public: Pricing & Checkout ──

export async function getPriceQuote(data: {
  eventId: string;
  ticketTierId: string;
  quantity: number;
}) {
  return apiFetch<{ success: boolean; data: any }>('/pricing/quote', {
    method: 'POST',
    body: data,
  });
}

export async function createCheckoutSession(
  data: {
    eventId: string;
    ticketTierId: string;
    quantity: number;
    buyerName: string;
    buyerEmail: string;
    buyerPhone?: string;
    attendees?: { name?: string; email?: string }[];
    marketingConsent?: boolean;
  },
  token?: string,
) {
  return apiFetch<{ success: boolean; data: { checkoutUrl: string; bookingReference: string } }>(
    '/checkout/session',
    { method: 'POST', body: data, token },
  );
}

// ── Public: Booking lookup / confirmation ──

export async function lookupBooking(email: string, bookingReference?: string) {
  return apiFetch<{ success: boolean; message: string }>('/booking/lookup', {
    method: 'POST',
    body: { email, bookingReference },
  });
}

export async function getBookingConfirmation(token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/booking/confirmation?token=${encodeURIComponent(token)}`);
}

// ── Public: Subscribers / Contact ──

export async function subscribe(data: {
  email: string;
  fullName?: string;
  categories?: string[];
  city?: string;
  source?: string;
}) {
  return apiFetch<{ success: boolean; message: string }>('/subscribers', {
    method: 'POST',
    body: data,
  });
}

export async function unsubscribe(email: string) {
  return apiFetch<{ success: boolean; message: string }>('/subscribers/unsubscribe', {
    method: 'POST',
    body: { email },
  });
}

export async function sendContactMessage(data: { name: string; email: string; message: string }) {
  return apiFetch<{ success: boolean; message: string }>('/contact', {
    method: 'POST',
    body: data,
  });
}

// ── Auth ──

interface AuthTokenResponse {
  success: boolean;
  data: {
    id_token: string;
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: any;
  };
}

export async function getMe(token: string) {
  return apiFetch<{ success: boolean; data: any }>('/auth/me', { token });
}

export async function signIn(email: string, password: string) {
  return apiFetch<AuthTokenResponse>('/auth/signin', {
    method: 'POST',
    body: { email, password },
  });
}

export async function signUp(email: string, password: string, name: string) {
  return apiFetch<{ success: boolean; message: string }>('/auth/signup', {
    method: 'POST',
    body: { email, password, name },
  });
}

export async function confirmEmail(email: string, code: string) {
  return apiFetch<{ success: boolean; message: string }>('/auth/confirm', {
    method: 'POST',
    body: { email, code },
  });
}

export async function resendCode(email: string) {
  return apiFetch<{ success: boolean; message: string }>('/auth/resend-code', {
    method: 'POST',
    body: { email },
  });
}

export async function forgotPassword(email: string) {
  return apiFetch<{ success: boolean; message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export async function resetPassword(email: string, code: string, newPassword: string) {
  return apiFetch<{ success: boolean; message: string }>('/auth/reset-password', {
    method: 'POST',
    body: { email, code, new_password: newPassword },
  });
}

export async function getCognitoLoginUrl() {
  return apiFetch<{ success: boolean; data: { loginUrl: string } }>('/auth/cognito/login');
}

export async function exchangeCognitoCode(code: string, redirectUri: string) {
  return apiFetch<AuthTokenResponse>('/auth/cognito/token', {
    method: 'POST',
    body: { code, redirect_uri: redirectUri },
  });
}

// ── Customer account ("Me") ──

export async function updateMe(data: { display_name?: string; phone?: string }, token: string) {
  return apiFetch<{ success: boolean; data: any }>('/me', { method: 'PATCH', body: data, token });
}

export async function getMyPreferences(token: string) {
  return apiFetch<{ success: boolean; data: any }>('/me/preferences', { token });
}

export async function updateMyPreferences(
  data: { marketing_consent?: boolean; category_preferences?: string[]; city_preference?: string },
  token: string,
) {
  return apiFetch<{ success: boolean; data: any }>('/me/preferences', { method: 'PATCH', body: data, token });
}

export async function getMyBookings(token: string) {
  return apiFetch<{ success: boolean; data: any[] }>('/me/bookings', { token });
}

export async function getMyBooking(bookingReference: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/me/bookings/${bookingReference}`, { token });
}

export async function resendMyTickets(bookingReference: string, token: string) {
  return apiFetch<{ success: boolean; message: string }>(`/me/bookings/${bookingReference}/resend`, {
    method: 'POST',
    token,
  });
}

export async function claimBooking(bookingReference: string, token: string) {
  return apiFetch<{ success: boolean; message: string }>('/me/bookings/claim', {
    method: 'POST',
    body: { bookingReference },
    token,
  });
}

export async function getMyTicketDownloadUrl(ticketId: string, token: string) {
  return apiFetch<{ success: boolean; data: { downloadUrl: string } }>(`/me/tickets/${ticketId}/download`, {
    token,
  });
}

// ── Media ──

export async function getPresignedUpload(
  contentType: string,
  folder: string,
  token: string,
) {
  return apiFetch<{ success: boolean; data: { uploadUrl: string; publicUrl: string; key: string } }>(
    '/media/presigned-upload',
    { method: 'POST', body: { contentType, folder }, token },
  );
}

export async function getPresignedAvatarUpload(contentType: string, token: string) {
  return apiFetch<{ success: boolean; data: { uploadUrl: string; publicUrl: string; key: string } }>(
    '/media/avatar-upload',
    { method: 'POST', body: { contentType }, token },
  );
}

export async function uploadToPresignedUrl(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error('Upload failed');
}

// ── Admin: Events ──

export async function adminGetEvents(token: string) {
  return apiFetch<{ success: boolean; data: any[] }>('/admin/events', { token });
}

export async function adminGetEvent(id: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/events/${id}`, { token });
}

export async function adminCreateEvent(data: Record<string, any>, token: string) {
  return apiFetch<{ success: boolean; data: any }>('/admin/events', { method: 'POST', body: data, token });
}

export async function adminUpdateEvent(id: string, data: Record<string, any>, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/events/${id}`, { method: 'PATCH', body: data, token });
}

export async function adminDeleteEvent(id: string, token: string) {
  return apiFetch<{ success: boolean; message: string }>(`/admin/events/${id}`, { method: 'DELETE', token });
}

export async function adminEventAction(
  id: string,
  action: 'publish' | 'pause-sales' | 'resume-sales' | 'cancel' | 'complete' | 'duplicate',
  token: string,
  body?: Record<string, any>,
) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/events/${id}/${action}`, {
    method: 'POST',
    body,
    token,
  });
}

export async function adminGetTicketTiers(eventId: string, token: string) {
  return apiFetch<{ success: boolean; data: any[] }>(`/admin/events/${eventId}/ticket-tiers`, { token });
}

export async function adminCreateTicketTier(eventId: string, data: Record<string, any>, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/events/${eventId}/ticket-tiers`, {
    method: 'POST',
    body: data,
    token,
  });
}

export async function adminUpdateTicketTier(
  eventId: string,
  tierId: string,
  data: Record<string, any>,
  token: string,
) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/events/${eventId}/ticket-tiers/${tierId}`, {
    method: 'PATCH',
    body: data,
    token,
  });
}

export async function adminDeleteTicketTier(eventId: string, tierId: string, token: string) {
  return apiFetch<{ success: boolean; message: string }>(`/admin/events/${eventId}/ticket-tiers/${tierId}`, {
    method: 'DELETE',
    token,
  });
}

// ── Admin: Bookings ──

export async function adminGetBookings(
  token: string,
  params?: { eventId?: string; status?: string; q?: string },
) {
  const qs = new URLSearchParams();
  if (params?.eventId) qs.set('eventId', params.eventId);
  if (params?.status) qs.set('status', params.status);
  if (params?.q) qs.set('q', params.q);
  const query = qs.toString();
  return apiFetch<{ success: boolean; data: any[] }>(`/admin/bookings${query ? `?${query}` : ''}`, { token });
}

export async function adminGetBooking(bookingReference: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/bookings/${bookingReference}`, { token });
}

export async function adminCreateManualBooking(data: Record<string, any>, token: string) {
  return apiFetch<{ success: boolean; data: any }>('/admin/bookings', { method: 'POST', body: data, token });
}

export async function adminCancelBooking(bookingReference: string, reason: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/bookings/${bookingReference}/cancel`, {
    method: 'POST',
    body: { reason },
    token,
  });
}

export async function adminResendConfirmation(bookingReference: string, token: string) {
  return apiFetch<{ success: boolean; message: string }>(`/admin/bookings/${bookingReference}/resend-confirmation`, {
    method: 'POST',
    token,
  });
}

export async function adminResendTickets(bookingReference: string, token: string) {
  return apiFetch<{ success: boolean; message: string }>(`/admin/bookings/${bookingReference}/resend-tickets`, {
    method: 'POST',
    token,
  });
}

export function adminBookingsExportUrl(eventId: string | undefined, token: string) {
  const qs = eventId ? `?eventId=${eventId}` : '';
  return `${API_URL}/admin/bookings/export${qs}`;
}

// ── Admin: Refunds ──

export async function adminGetRefunds(token: string, params?: { eventId?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.eventId) qs.set('eventId', params.eventId);
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString();
  return apiFetch<{ success: boolean; data: any[] }>(`/admin/refunds${query ? `?${query}` : ''}`, { token });
}

export async function adminCreateRefund(
  data: { bookingId: string; amountMinor: number; reason: string },
  token: string,
) {
  return apiFetch<{ success: boolean; data: any }>('/admin/refunds', { method: 'POST', body: data, token });
}

export async function adminRetryRefund(id: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/refunds/${id}/retry`, { method: 'POST', token });
}

// ── Admin: Communications ──

export async function adminGetCampaigns(token: string) {
  return apiFetch<{ success: boolean; data: any[] }>('/admin/communications', { token });
}

export async function adminGetCampaign(id: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/communications/${id}`, { token });
}

export async function adminCreateCampaign(data: Record<string, any>, token: string) {
  return apiFetch<{ success: boolean; data: any }>('/admin/communications', { method: 'POST', body: data, token });
}

export async function adminUpdateCampaign(id: string, data: Record<string, any>, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/communications/${id}`, {
    method: 'PATCH',
    body: data,
    token,
  });
}

export async function adminDeleteCampaign(id: string, token: string) {
  return apiFetch<{ success: boolean; message: string }>(`/admin/communications/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function adminTestCampaign(id: string, email: string | undefined, token: string) {
  return apiFetch<{ success: boolean; message: string }>(`/admin/communications/${id}/test`, {
    method: 'POST',
    body: { email },
    token,
  });
}

export async function adminScheduleCampaign(id: string, scheduledAt: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/communications/${id}/schedule`, {
    method: 'POST',
    body: { scheduledAt },
    token,
  });
}

export async function adminSendCampaign(id: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/communications/${id}/send`, { method: 'POST', token });
}

export async function adminCancelCampaign(id: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/communications/${id}/cancel`, { method: 'POST', token });
}

// ── Admin: Reports ──

export async function adminGetDashboard(token: string) {
  return apiFetch<{ success: boolean; data: any }>('/admin/reports/dashboard', { token });
}

export async function adminGetSalesReport(token: string, eventId?: string) {
  const qs = eventId ? `?eventId=${eventId}` : '';
  return apiFetch<{ success: boolean; data: any }>(`/admin/reports/sales${qs}`, { token });
}

export async function adminGetAttendanceReport(token: string, eventId: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/reports/attendance?eventId=${eventId}`, { token });
}

// ── Admin: Settings ──

export async function adminGetSettings(token: string) {
  return apiFetch<{ success: boolean; data: any }>('/admin/settings', { token });
}

export async function adminUpdateSettings(data: Record<string, any>, token: string) {
  return apiFetch<{ success: boolean; data: any }>('/admin/settings', { method: 'PUT', body: data, token });
}

// ── Admin: Admin-users ──

export async function adminGetAdminUsers(token: string) {
  return apiFetch<{ success: boolean; data: any[] }>('/admin/admin-users', { token });
}

export async function adminInviteAdminUser(
  data: { email: string; name: string; role: 'ADMIN' | 'SUPER_ADMIN' },
  token: string,
) {
  return apiFetch<{ success: boolean; data: any }>('/admin/admin-users/invite', {
    method: 'POST',
    body: data,
    token,
  });
}

export async function adminUpdateAdminUser(
  id: string,
  data: { role?: string; disabled?: boolean },
  token: string,
) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/admin-users/${id}`, {
    method: 'PATCH',
    body: data,
    token,
  });
}

// ── Admin: Customers ──

export async function adminGetCustomers(token: string, q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  return apiFetch<{ success: boolean; data: any[] }>(`/admin/customers${qs}`, { token });
}

export async function adminGetCustomer(id: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/customers/${id}`, { token });
}

// ── Admin: Subscribers ──

export async function adminGetSubscribers(token: string, params?: { status?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.q) qs.set('q', params.q);
  const query = qs.toString();
  return apiFetch<{ success: boolean; data: any[]; meta: any }>(`/admin/subscribers${query ? `?${query}` : ''}`, {
    token,
  });
}

// ── Admin: Audit log ──

export async function adminGetAuditLog(
  token: string,
  params?: { entityType?: string; actorUserId?: string; action?: string; eventId?: string; bookingId?: string; limit?: number },
) {
  const qs = new URLSearchParams();
  if (params?.entityType) qs.set('entityType', params.entityType);
  if (params?.actorUserId) qs.set('actorUserId', params.actorUserId);
  if (params?.action) qs.set('action', params.action);
  if (params?.eventId) qs.set('eventId', params.eventId);
  if (params?.bookingId) qs.set('bookingId', params.bookingId);
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiFetch<{ success: boolean; data: any[] }>(`/admin/audit-log${query ? `?${query}` : ''}`, { token });
}

// ── Public: Gallery ──

export async function getGallery(params?: { eventId?: string; type?: string; year?: string; featured?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.eventId) qs.set('eventId', params.eventId);
  if (params?.type) qs.set('type', params.type);
  if (params?.year) qs.set('year', params.year);
  if (params?.featured) qs.set('featured', 'true');
  const query = qs.toString();
  return apiFetch<{ success: boolean; data: any[] }>(`/gallery${query ? `?${query}` : ''}`);
}

export async function getGalleryItem(mediaId: string) {
  return apiFetch<{ success: boolean; data: any }>(`/gallery/${mediaId}`);
}

// ── Public: Event-service enquiries ──

export async function submitServiceEnquiry(data: {
  eventServiceType: string;
  fullName: string;
  email: string;
  phone?: string;
  preferredDate?: string;
  preferredDateEnd?: string;
  venueOrCity?: string;
  estimatedGuestCount?: number;
  budgetRange?: string;
  message: string;
  consentToContact: boolean;
  source?: 'SERVICES_PAGE' | 'CONTACT_PAGE';
}) {
  return apiFetch<{ success: boolean; message: string }>('/service-enquiries', {
    method: 'POST',
    body: data,
  });
}

// ── Admin: Gallery ──

export async function adminGetGallery(token: string, params?: { status?: string; type?: string; eventId?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.type) qs.set('type', params.type);
  if (params?.eventId) qs.set('eventId', params.eventId);
  const query = qs.toString();
  return apiFetch<{ success: boolean; data: any[] }>(`/admin/gallery${query ? `?${query}` : ''}`, { token });
}

export async function adminGetGalleryItem(mediaId: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/gallery/${mediaId}`, { token });
}

export async function adminCreateGalleryItem(data: Record<string, any>, token: string) {
  return apiFetch<{ success: boolean; data: any }>('/admin/gallery', { method: 'POST', body: data, token });
}

export async function adminUpdateGalleryItem(mediaId: string, data: Record<string, any>, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/gallery/${mediaId}`, { method: 'PATCH', body: data, token });
}

export async function adminPublishGalleryItem(mediaId: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/gallery/${mediaId}/publish`, { method: 'POST', token });
}

export async function adminUnpublishGalleryItem(mediaId: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/gallery/${mediaId}/unpublish`, { method: 'POST', token });
}

export async function adminArchiveGalleryItem(mediaId: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/gallery/${mediaId}/archive`, { method: 'POST', token });
}

export async function adminReorderGallery(items: { id: string; sortOrder: number }[], token: string) {
  return apiFetch<{ success: boolean; data: any[] }>('/admin/gallery/reorder', {
    method: 'POST',
    body: { items },
    token,
  });
}

export async function adminDeleteGalleryItem(mediaId: string, token: string) {
  return apiFetch<{ success: boolean; message: string }>(`/admin/gallery/${mediaId}`, { method: 'DELETE', token });
}

// ── Admin: Event-service enquiries ──

export async function adminGetServiceEnquiries(
  token: string,
  params?: { status?: string; eventServiceType?: string; q?: string },
) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.eventServiceType) qs.set('eventServiceType', params.eventServiceType);
  if (params?.q) qs.set('q', params.q);
  const query = qs.toString();
  return apiFetch<{ success: boolean; data: any[] }>(`/admin/service-enquiries${query ? `?${query}` : ''}`, {
    token,
  });
}

export async function adminGetServiceEnquiry(enquiryId: string, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/service-enquiries/${enquiryId}`, { token });
}

export async function adminUpdateServiceEnquiry(enquiryId: string, data: Record<string, any>, token: string) {
  return apiFetch<{ success: boolean; data: any }>(`/admin/service-enquiries/${enquiryId}`, {
    method: 'PATCH',
    body: data,
    token,
  });
}

export async function adminExportServiceEnquiries(
  params: { status?: string; eventServiceType?: string; q?: string } | undefined,
  token: string,
) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.eventServiceType) qs.set('eventServiceType', params.eventServiceType);
  if (params?.q) qs.set('q', params.q);
  const query = qs.toString();
  const res = await fetch(`${API_URL}/admin/service-enquiries/export${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to export enquiries');
  return res.blob();
}
