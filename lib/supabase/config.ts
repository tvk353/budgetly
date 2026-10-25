export class SupabaseConfigurationError extends Error {
  constructor() {
    super('Configure the Supabase URL and publishable key before using the backend.');
    this.name = 'SupabaseConfigurationError';
  }
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) throw new SupabaseConfigurationError();

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new SupabaseConfigurationError();
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsedUrl.hostname);
  if (parsedUrl.protocol !== 'https:' && !(local && parsedUrl.protocol === 'http:')) {
    throw new SupabaseConfigurationError();
  }
  // Only new publishable keys are accepted, avoiding legacy service-role JWT confusion.
  if (!key.startsWith('sb_publishable_') || parsedUrl.username || parsedUrl.password) {
    throw new SupabaseConfigurationError();
  }

  return { url, key };
}
