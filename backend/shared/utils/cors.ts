export function normalizeOrigins(originsRaw?: string | string[]) {
  if (!originsRaw) return [];
  const arr = Array.isArray(originsRaw) ? originsRaw : originsRaw.split(',').map(s => s.trim()).filter(Boolean);

  const normalized = new Set<string>();
  for (const o of arr) {
    try {
      const u = new URL(o);
      normalized.add(u.origin);
      // also add the www/non-www counterpart
      const host = u.hostname;
      if (host.startsWith('www.')) {
        const nonWww = `${u.protocol}//${host.replace(/^www\./, '')}`;
        normalized.add(nonWww);
      } else {
        const www = `${u.protocol}//www.${host}`;
        normalized.add(www);
      }
    } catch (e) {
      // if it's not a full URL, include as-is
      if (typeof o === 'string' && o.length) normalized.add(o);
    }
  }

  return Array.from(normalized);
}
