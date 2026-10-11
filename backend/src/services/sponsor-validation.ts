const NAME_MAX = 120;
const DESCRIPTION_MAX = 500;

export interface SponsorInput {
  name?: unknown;
  logoUrl?: unknown;
  websiteUrl?: unknown;
  description?: unknown;
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/** Returns an error message, or null when the provided fields are valid. Only fields present are checked unless `requireCore`. */
export function validateSponsorInput(input: SponsorInput, requireCore: boolean): string | null {
  if (requireCore || input.name !== undefined) {
    if (typeof input.name !== 'string' || !input.name.trim()) return 'name is required';
    if (input.name.trim().length > NAME_MAX) return `name must be at most ${NAME_MAX} characters`;
  }
  if (requireCore || input.logoUrl !== undefined) {
    if (!isHttpUrl(input.logoUrl)) return 'A valid logo image URL is required (upload the logo first)';
  }
  // Blocks javascript:/data: URLs, which would be rendered as an <a href>.
  if (input.websiteUrl !== undefined && input.websiteUrl !== null && input.websiteUrl !== '') {
    if (!isHttpUrl(input.websiteUrl)) return 'websiteUrl must be a valid http(s) URL';
  }
  if (input.description !== undefined && input.description !== null && input.description !== '') {
    if (typeof input.description !== 'string') return 'description must be text';
    if (input.description.length > DESCRIPTION_MAX) return `description must be at most ${DESCRIPTION_MAX} characters`;
  }
  return null;
}

export function toPublicSponsor(s: {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string;
  description?: string;
}) {
  return { id: s.id, name: s.name, logoUrl: s.logoUrl, websiteUrl: s.websiteUrl, description: s.description };
}
