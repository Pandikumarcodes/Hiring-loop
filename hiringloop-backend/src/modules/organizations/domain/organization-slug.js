const MAX_SLUG_LENGTH = 63;
const FALLBACK_SLUG = 'organization';

export function normalizeOrganizationSlug(name) {
  const normalized = String(name ?? '')
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized.length < 3) return FALLBACK_SLUG;

  return normalized.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '');
}

export function slugForAttempt(name, attempt) {
  const baseSlug = normalizeOrganizationSlug(name);
  if (attempt === 1) return baseSlug;

  const suffix = `-${attempt}`;
  return `${baseSlug.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/g, '')}${suffix}`;
}
