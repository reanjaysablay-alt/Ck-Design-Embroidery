'use client';

import { useState } from 'react';
import { FONT_OPTIONS } from '@/lib/fonts';

// Color fields in the settings form — the swatch preview updates live so
// the admin can see the new color as they pick it.
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

  return (
    <form action={action} className="space-y-10 max-w-2xl">
      {/* Text settings */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-gold mb-4">Site text</h2>
        <div className="space-y-4">
          <TextField label="Site title" name="site_title" defaultValue={settings?.site_title} />
          <TextField label="Tagline" name="site_tagline" defaultValue={settings?.site_tagline} />
          <TextField label="Hero heading" name="hero_heading" defaultValue={settings?.hero_heading} />
          <div>
            <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">
              Hero subheading
            </label>
            <textarea
              name="hero_subheading"
              rows={3}
              defaultValue={settings?.hero_subheading}
              className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread focus-visible:outline-gold"
            />
          </div>
        </div>
      </div>

      {/* Font settings */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-gold mb-4">Fonts</h2>
        <p className="text-thread/50 text-sm mb-4">
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
        <h2 className="text-xs uppercase tracking-widest text-gold mb-4">Theme colors</h2>
        <p className="text-thread/50 text-sm mb-4">
          These apply across the whole site — background, text, accents.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COLOR_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">
                {f.label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorValues[f.key]}
                  onChange={(e) => setColor(f.key, e.target.value)}
                  className="w-10 h-10 border border-white/15 rounded-sm bg-canvas2 cursor-pointer"
                  aria-label={f.label}
                />
                <input
                  type="text"
                  name={f.key}
                  value={colorValues[f.key]}
                  onChange={(e) => setColor(f.key, e.target.value)}
                  className="flex-1 bg-canvas2 border border-white/15 rounded-sm px-4 py-2 text-thread font-mono text-sm focus-visible:outline-gold"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <button
          type="submit"
          className="bg-gold text-ink font-body uppercase tracking-widest text-sm px-8 py-3.5 rounded-sm hover:bg-thread transition-colors"
        >
          Save Settings
        </button>
      </div>
    </form>
  );
}

function TextField({ label, name, defaultValue }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">
        {label}
      </label>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread focus-visible:outline-gold"
      />
    </div>
  );
}

// Font picker — a styled <select> whose options render in their own font,
// so the admin sees a live preview of each typeface as they pick.
function FontField({ label, name, defaultValue }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">
        {label}
      </label>
      <div className="relative">
        <select
          name={name}
          defaultValue={defaultValue}
          className="w-full appearance-none bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread focus-visible:outline-gold cursor-pointer"
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font.key} value={font.key}>
              {font.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-thread/50">
          ▼
        </span>
      </div>
      <p className="text-thread/40 text-xs mt-1.5" style={{ fontFamily: `var(${getDefaultFontVar(defaultValue)})` }}>
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

