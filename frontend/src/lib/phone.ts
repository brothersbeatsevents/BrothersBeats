export const PHONE_PATTERN = String.raw`(?=(?:\D*[0-9]){7,15}\D*$)\+?(?:[0-9]| |\(|\)|-)+`;
export const PHONE_ERROR = 'Enter a valid phone number with 7–15 digits. Use only numbers, spaces, brackets, hyphens, and an optional leading +.';

export const phoneInputProps = {
  type: 'tel',
  inputMode: 'tel',
  autoComplete: 'tel',
  pattern: PHONE_PATTERN,
  maxLength: 40,
  title: PHONE_ERROR,
} as const;

export function isValidOptionalPhone(value: string | undefined): boolean {
  return value === undefined || value.trim() === '' ||
    (value.trim().length <= 40 && new RegExp(`^${PHONE_PATTERN}$`).test(value.trim()));
}
