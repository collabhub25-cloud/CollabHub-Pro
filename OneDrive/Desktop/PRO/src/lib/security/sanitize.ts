export function sanitizeString(input: string, maxLength = 5000): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/\$(?:gt|gte|lt|lte|ne|in|nin|regex|exists|where|expr)/g, '');
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T, maxDepth = 3): T {
  if (maxDepth <= 0) return obj;
  const result = { ...obj };
  for (const key in result) {
    const value = result[key];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>, maxDepth - 1);
    } else if (Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = value.map(v => typeof v === 'string' ? sanitizeString(v) : v);
    }
  }
  return result;
}
