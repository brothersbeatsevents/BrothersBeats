export const AUTH_RETURN_PATH_KEY = 'bb_auth_return_path';

/** Only return to a page within this app, preserving ticket-selection queries. */
export function getAuthReturnPath(value?: string | null): string {
  const fallback = '/account';
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const origin = 'https://return.invalid';
    const url = new URL(value, origin);
    const pathname = decodeURIComponent(url.pathname);
    if (url.origin !== origin || pathname.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

type AuthPage = '/auth/sign-in' | '/auth/sign-up' | '/auth/verify-email' | '/auth/forgot-password' | '/auth/reset-password';

export function authPageUrl(page: AuthPage, returnTo: string, params: Record<string, string> = {}): string {
  return `${page}?${new URLSearchParams({ ...params, next: getAuthReturnPath(returnTo) })}`;
}
