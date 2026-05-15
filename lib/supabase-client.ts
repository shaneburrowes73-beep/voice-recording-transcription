'use client';

import { createClient } from '@supabase/supabase-js';

let supabaseBrowserClient: ReturnType<typeof createClient> | null = null;

function getSupabaseBrowser() {
  if (!supabaseBrowserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    supabaseBrowserClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }

  return supabaseBrowserClient;
}

export const supabaseBrowser = new Proxy({} as ReturnType<typeof createClient>, {
  get: (target, prop) => {
    const client = getSupabaseBrowser();
    return (client as any)[prop];
  },
});
