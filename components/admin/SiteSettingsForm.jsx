'use client';

import { useState, useEffect } from 'react';
import { FONT_OPTIONS } from '@/lib/fonts';
import defaultLogo from '@/logo/ck-logo-transparent.png';

// Color fields in the settings form — the swatch preview updates live so
// the admin can see the new color as they pick it. These map straight to
// CSS variables the storefront reads (see app/layout.js) — none of this
// touches the admin dashboard's own look, which uses its own fixed
// light theme, independent of these values.
const COLOR_FIELDS = [
  { key: 'color_canvas', label: 'Background (canvas)', fallback: '#000000' },
  { key: 'color_canvas2', label: 'Panel (canvas2)', fallback: '#111111' },
  { key: 'color_thread', label: 'Text (thread)', fallback: '#F4EFE3' },
  { key: 'color_gold', label: 'Accent (gold)', fallback: '#D4A537' },
  { key: 'color_linen', label: 'Linen', fallback: '#EFE7D8' },
  { key: 'color_linen2', label: 'Linen card', fallback: '#E4D9C4' },
  { key: 'color_ink', label: 'Ink', fallback: '#1C1811' },
  { key: 'color_stitchRed', label: 'Alert red', fallback: '#A73B3B' },
];

export default function SiteSettingsForm({ settings, action }) {
  // Track color values in state so the native color swatch + text field
  // stay in sync. Hidden inputs carry these into the server action.
  const [colorValues, setColorValues] = useState(() =>
    Object.fromEntries(
      COLOR_FIELDS.map((f) => [f.key, settings?.[f.key] || f.fallback])
    )
  );
  function setColor(key, value) {
    setColorValues((prev) => ({ ...prev, [key]: value }));
  }
  const [logoBusy, setLogoBusy] = useState(false);

  return (
    <form action={action} className="space-y-10 max-w-2xl">
      <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl px-4 py-3 text-sm">
        These settings only change how the customer-facing storefront looks —
        the admin dashboard you're using right now stays exactly as it is.
      </div>

      {/* Logo */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Logo</h2>
        <LogoField
          initial={settings?.site_logo}
          background={colorValues.color_canvas}
          defaultSrc={defaultLogo.src}
          onBusyChange={setLogoBusy}
        />
      </div>

      {/* Text settings */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Site text</h2>
        <div className="space-y-4">
          <TextField label="Site title" name="site_title" defaultValue={settings?.site_title} />
          <TextField label="Tagline" name="site_tagline" defaultValue={settings?.site_tagline} />
          <TextField label="Hero heading" name="hero_heading" defaultValue={settings?.hero_heading} />
          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2">
              Hero subheading
            </label>
            <textarea
              name="hero_subheading"
              rows={3}
              defaultValue={settings?.hero_subheading}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus-visible:outline-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Font settings */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Fonts</h2>
        <p className="text-slate-500 text-sm mb-4">
          Choose the font for the site title, tagline, and hero heading.
        </p>
        <div className="space-y-4">
          <FontField
            label="Site title font"
            name="title_font"
            defaultValue={settings?.title_font || 'fraunces'}
          />
          <FontField
            label="Tagline font"
            name="tagline_font"
            defaultValue={settings?.tagline_font || 'fraunces'}
          />
          <FontField
            label="Hero heading font"
            name="heading_font"
            defaultValue={settings?.heading_font || 'fraunces'}
          />
        </div>
      </div>

      {/* Color settings */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Theme colors</h2>
        <p className="text-slate-500 text-sm mb-4">
          These apply across the storefront only — background, text, accents.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COLOR_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2">
                {f.label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorValues[f.key]}
                  onChange={(e) => setColor(f.key, e.target.value)}
                  className="w-10 h-10 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer"
                  aria-label={f.label}
                />
                <input
                  type="text"
                  name={f.key}
                  value={colorValues[f.key]}
                  onChange={(e) => setColor(f.key, e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-mono text-sm focus-visible:outline-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={logoBusy}
          className="bg-indigo-600 text-white font-medium text-sm px-8 py-3.5 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {logoBusy ? 'Uploading logo…' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}

// Logo picker. The file is uploaded the moment it is chosen (a big file
// inside the form submit could exceed Vercel's request limit); only the
// resulting URL is saved with the rest of the settings. An empty value
// means "use the default logo".
function LogoField({ initial, background, defaultSrc, onBusyChange }) {
  const [url, setUrl] = useState(initial || '');
  const [status, setStatus] = useState('idle'); // idle | uploading | error
  const [error, setError] = useState('');

  useEffect(() => {
    onBusyChange?.(status === 'uploading');
  }, [status, onBusyChange]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setStatus('error');
      setError('Logo is too large — please use a file under 4MB.');
      return;
    }

    setStatus('uploading');
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/product-image', { method: 'POST', body });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Upload failed');
      setUrl(result.url);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Upload failed — please try again.');
    }
  }

  return (
    <div>
      <input type="hidden" name="site_logo" value={url} />

      <p className="text-slate-500 text-sm mb-3">
        Shown in the storefront header next to the site title. A PNG with a transparent background
        works best (also JPG, WebP or SVG, under 4MB).
      </p>

      <div
        className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-6 py-5 mb-3"
        style={{ background }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url || defaultSrc}
          alt="Current logo"
          className="h-14 w-auto max-w-[240px] object-contain"
        />
      </div>
      <p className="text-slate-400 text-xs mb-4">
        {url ? 'Custom logo' : 'Default logo'} — previewed on your storefront background color.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFile}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-indigo-600 file:text-white file:text-xs file:uppercase file:tracking-widest focus-visible:outline-indigo-500"
        />
        {url && (
          <button
            type="button"
            onClick={() => {
              setUrl('');
              setStatus('idle');
              setError('');
            }}
            className="h-10 px-4 rounded-full border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
          >
            Use default logo
          </button>
        )}
      </div>

      {status === 'uploading' && <p className="text-indigo-600 text-sm mt-3">Uploading…</p>}
      {status === 'error' && <p className="text-red-600 text-sm mt-3">{error}</p>}
      <p className="text-slate-400 text-xs mt-3">
        Click <strong>Save Settings</strong> below to apply the new logo on the site.
      </p>
    </div>
  );
}

function TextField({ label, name, defaultValue }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2">
        {label}
      </label>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus-visible:outline-indigo-500"
      />
    </div>
  );
}

// Font picker — a styled <select> whose options render in their own font,
// so the admin sees a live preview of each typeface as they pick.
function FontField({ label, name, defaultValue }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2">
        {label}
      </label>
      <div className="relative">
        <select
          name={name}
          defaultValue={defaultValue}
          className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus-visible:outline-indigo-500 cursor-pointer"
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font.key} value={font.key}>
              {font.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          ▼
        </span>
      </div>
      <p className="text-slate-400 text-xs mt-1.5" style={{ fontFamily: `var(${getDefaultFontVar(defaultValue)})` }}>
        Preview: The quick brown fox jumps over the lazy dog.
      </p>
    </div>
  );
}

// Map a saved font key to its CSS variable for the preview line. Defaults
// to the first option if the key isn't recognized.
function getDefaultFontVar(key) {
  const found = FONT_OPTIONS.find((f) => f.key === key);
  return found ? found.variable : FONT_OPTIONS[0].variable;
}
