const PHONE_PATTERN = /^(?=(?:\D*[0-9]){7,15}\D*$)\+?(?:[0-9]| |\(|\)|-)+$/;
export const PHONE_ERROR = 'Enter a valid phone number with 7–15 digits. Use only numbers, spaces, brackets, hyphens, and an optional leading +.';

/** Phone fields are optional, but any supplied number must have a valid format. */
export function isValidOptionalPhone(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value !== 'string') return false;
  const phone = value.trim();
  return phone === '' || (phone.length <= 40 && PHONE_PATTERN.test(phone));
}
