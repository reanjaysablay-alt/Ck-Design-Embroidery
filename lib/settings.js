import { createAdminClient } from '@/lib/supabase/server';

// Defaults — these mirror the original static theme so the site renders
// correctly even before any settings have been saved (or if the table
// hasn't been created yet).
export const DEFAULT_SETTINGS = {
  site_title: 'CK Design Embroidery',
  site_tagline: 'Custom Embroidery & Shop',
  hero_heading: 'Every logo, stitched to hold.',
  hero_subheading:
    'We run custom embroidery for businesses who need uniforms, merch, and branded gear done right — and stock a small shop of ready-made embroidered pieces stitched right here in-house.',
  color_canvas: '#000000',
  color_canvas2: '#111111',
  color_thread: '#F4EFE3',
  color_gold: '#D4A537',
  color_linen: '#EFE7D8',
  color_linen2: '#E4D9C4',
  color_ink: '#1C1811',
  color_stitchRed: '#A73B3B',
};

// Reads site settings from Supabase, merged over the defaults so any
// missing keys still resolve. Uses the anon client (public read policy).
// The settings table is publicly readable, so we use a plain supabase-js
// client instead of the cookie-based server client — this keeps
// getSiteSettings free of dynamic APIs (cookies) so it can run during
// static generation without errors.
export async function getSiteSettings() {
  const settings = { ...DEFAULT_SETTINGS };

  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data, error } = await supabase.from('site_settings').select('*');
    if (!error && data) {
      for (const row of data) {
        if (row.key in settings) settings[row.key] = row.value;
      }
    }
  } catch (err) {
    // No env vars configured yet (fresh clone, no .env.local) or no
    // network during build — defaults keep the site rendering fine.
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('getSiteSettings error:', err.message);
    }
  }

  return settings;
}

// Saves the editable settings. Uses the service-role key (bypasses RLS);
// callers must verify admin status first.
export async function saveSiteSettings(settings) {
  const admin = createAdminClient();
  const upsertRows = Object.entries(settings)
    .filter(([key]) => key in DEFAULT_SETTINGS)
    .map(([key, value]) => ({
      key,
      value: String(value ?? ''),
      updated_at: new Date().toISOString(),
    }));

  const { error } = await admin.from('site_settings').upsert(upsertRows, {
    onConflict: 'key',
  });

  if (error) throw new Error(error.message);
  return true;
}

