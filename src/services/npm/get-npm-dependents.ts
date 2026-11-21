import type { SupabaseClient } from '@supabase/supabase-js';

import { cachedAsync } from '../../utils/storage/cached-async';

const memCache = new Map<string, Promise<number | null> | number | null>();

/**
 * npm's own count of the packages that depend on `name`, through the
 * npm-dependents function. null when it can't be had: the count is a
 * fallback for ecosyste.ms, so it never fails the page.
 */
export const getNpmDependents = async (
  supabase: SupabaseClient,
  name: string,
  signal?: AbortSignal
): Promise<number | null> => {
  try {
    return await cachedAsync(
      memCache,
      `npm-dependents:${name}`,
      undefined,
      async () => {
        const { data, error } = await supabase.functions.invoke(
          'npm-dependents',
          {
            body: { name },
            headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY.trim() },
            signal
          }
        );

        if (error || !data?.ok) throw new Error('npm-dependents failed');

        return typeof data.dependents === 'number' ? data.dependents : null;
      }
    );
  } catch {
    return null;
  }
};
