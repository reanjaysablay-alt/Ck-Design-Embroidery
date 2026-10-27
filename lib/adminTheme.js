import { FONT_OPTIONS, getFontOption } from '@/lib/fonts';

// Interface theme for the Admin and Staff dashboards (/admin/*).
//
// Admin → Settings → "Admin & Staff interface" lets the owner pick colors,
// a font and a text size separately for the Admin account and for the
// Staff accounts (cashier accounts count as Staff). Everything is stored
// as plain key/value rows in the existing `site_settings` table, so no
// database migration is needed. Keys look like: admintheme_staff_bg.
//
// How it is applied: the admin layout renders a small <style> tag built
// by buildAdminThemeCss() below. The dashboard screens are written with
// fixed Tailwind utilities (bg-white, text-slate-900, bg-indigo-600 …),
// so the generated CSS re-maps those utilities to the chosen colors
// inside .admin-shell — the same technique the Dark Mode switch uses.
// Screen only: printing (receipts, shipping labels) is never affected.

export const ADMIN_THEME_ROLES = ['admin', 'staff'];

export const ADMIN_THEME_FIELD_DEFAULTS = {
  enabled: 'false', // 'true' = use the custom colors below
  bg: '#f8fafc', //    page background
  panel: '#ffffff', // sidebar, cards, panels
  text: '#0f172a', //  main text
  accent: '#4f46e5', // buttons, active menu item, links
  font: 'default', //  'default' or a key from lib/fonts.js
  size: '100', //      text size, percent
};

export const ADMIN_SIZE_MIN = 85;
export const ADMIN_SIZE_MAX = 130;

export const adminThemeKey = (role, field) => `admintheme_${role}_${field}`;

// Merged into DEFAULT_SETTINGS (lib/settings.js) so saveSiteSettings()
// accepts these keys and getSiteSettings() returns them.
export const ADMIN_THEME_DEFAULT_SETTINGS = Object.fromEntries(
  ADMIN_THEME_ROLES.flatMap((role) =>
    Object.entries(ADMIN_THEME_FIELD_DEFAULTS).map(([field, value]) => [
      adminThemeKey(role, field),
      value,
    ])
  )
);

// Font choices for the dashboards: "default" keeps the current look,
// the rest reuse the fonts already loaded for the storefront.
export const ADMIN_FONT_OPTIONS = [
  { key: 'default', label: 'Default (current look)', variable: null },
  ...FONT_OPTIONS,
];

// ---------------------------------------------------------------------------
// Validation — used when saving AND again when rendering, because the CSS is
// injected into the page; only strictly validated values may reach it.
// ---------------------------------------------------------------------------
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function cleanHex(value, fallback) {
  const v = String(value ?? '').trim();
  return HEX_RE.test(v) ? v.toLowerCase() : fallback;
}

export function cleanSize(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return Number(ADMIN_THEME_FIELD_DEFAULTS.size);
  return Math.min(ADMIN_SIZE_MAX, Math.max(ADMIN_SIZE_MIN, n));
}

export function cleanFontKey(value) {
  const v = String(value ?? '').trim();
  return v === 'default' || FONT_OPTIONS.some((f) => f.key === v) ? v : 'default';
}

// Relative luminance (0 = black, 1 = white).
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

// Reads one role's theme out of the settings object and sanitises it.
export function getAdminTheme(settings, role) {
  const get = (field) => settings?.[adminThemeKey(role, field)] ?? ADMIN_THEME_FIELD_DEFAULTS[field];
  const d = ADMIN_THEME_FIELD_DEFAULTS;

  const bg = cleanHex(get('bg'), d.bg);
  const panel = cleanHex(get('panel'), d.panel);
  const text = cleanHex(get('text'), d.text);
  const accent = cleanHex(get('accent'), d.accent);

  return {
    colorsEnabled: String(get('enabled')) === 'true',
    bg,
    panel,
    text,
    accent,
    fontKey: cleanFontKey(get('font')),
    size: cleanSize(get('size')),
    // A dark custom background also turns on the dashboard's built-in dark
    // palette (for status badges etc.) so nothing ends up unreadable.
    dark: (luminance(bg) + luminance(panel)) / 2 < 0.4,
    onAccent: luminance(accent) > 0.18 ? '#0f172a' : '#ffffff',
  };
}

// 'dark' | 'light' | null — what the sidebar should force. null means the
// custom colors are off and the normal Dark Mode switch stays in charge.
export function getAdminThemeLock(theme) {
  if (!theme.colorsEnabled) return null;
  return theme.dark ? 'dark' : 'light';
}

// Builds the <style> contents for the admin layout. Returns '' when the
// theme is entirely at its defaults, so nothing extra is rendered.
export function buildAdminThemeCss(theme) {
  const parts = [];

  // --- Text size: Tailwind sizes are rem-based, so scaling <html> scales
  //     everything in the dashboard. (This <style> only exists while an
  //     /admin page is on screen, so the storefront is never affected.)
  if (theme.size !== 100) {
    parts.push(`html{font-size:${theme.size}%}`);
  }

  // --- Font
  if (theme.fontKey !== 'default') {
    const { variable } = getFontOption(theme.fontKey);
    // 'Dirham' stays first so the dirham currency symbol still renders.
    const stack = `'Dirham',var(${variable}),sans-serif`;
    parts.push(
      `html .admin-shell,html .admin-shell .font-display,html .admin-shell .font-body,` +
        `html .admin-shell .font-title,html .admin-shell .font-heading,html .admin-shell .font-tagline` +
        `{font-family:${stack}}`
    );
  }

  // --- Colors
  if (theme.colorsEnabled) {
    const P = 'html .admin-shell.admin-themed';
    // Anything marked keep-light (e.g. the shipping label) is left alone.
    const N = ':not(:where(.keep-light,.keep-light *))';
    const rule = (selectors, decl) =>
      `${selectors.map((s) => `${P} ${s}${N}`).join(',')}{${decl}}`;
    const mix = (a, pct, b) => `color-mix(in srgb,${a} ${pct}%,${b})`;

    const muted = mix('var(--adm-text)', 58, 'var(--adm-panel)');
    const soft = mix('var(--adm-text)', 80, 'var(--adm-panel)');
    const line = mix('var(--adm-text)', 14, 'var(--adm-panel)');
    const lineStrong = mix('var(--adm-text)', 26, 'var(--adm-panel)');
    const tint = mix('var(--adm-text)', 8, 'var(--adm-panel)');
    const tintStrong = mix('var(--adm-text)', 14, 'var(--adm-panel)');
    const accentSoft = mix('var(--adm-accent)', 11, 'var(--adm-panel)');
    const accentSofter = mix('var(--adm-accent)', 20, 'var(--adm-panel)');
    const accentLine = mix('var(--adm-accent)', 38, 'var(--adm-panel)');
    const accentHover = mix('var(--adm-accent)', 84, '#000000');

    parts.push(
      `${P}{--adm-bg:${theme.bg};--adm-panel:${theme.panel};--adm-text:${theme.text};` +
        `--adm-accent:${theme.accent};--adm-on-accent:${theme.onAccent};` +
        `background-color:var(--adm-bg);color:var(--adm-text);` +
        `color-scheme:${theme.dark ? 'dark' : 'light'}}`,

      // Backgrounds
      rule(['.bg-slate-50'], 'background-color:var(--adm-bg)'),
      rule(['.bg-white', '.hover\\:bg-white:hover', '.focus\\:bg-white:focus'], 'background-color:var(--adm-panel)'),
      rule(
        ['.bg-slate-100', '.hover\\:bg-slate-50:hover', '.hover\\:bg-slate-100:hover'],
        `background-color:${tint}`
      ),
      rule(['.bg-slate-300'], `background-color:${lineStrong}`),
      rule(
        ['.bg-slate-900', '.bg-slate-950', '.bg-indigo-600', '.bg-indigo-500', '.hover\\:bg-indigo-600:hover'],
        'background-color:var(--adm-accent);color:var(--adm-on-accent)'
      ),
      rule(['.hover\\:bg-slate-800:hover', '.hover\\:bg-indigo-700:hover'], `background-color:${accentHover}`),
      rule(['.bg-indigo-50', '.hover\\:bg-indigo-50:hover'], `background-color:${accentSoft}`),
      rule(['.bg-indigo-100'], `background-color:${accentSofter}`),
      // Text inside accent-colored buttons keeps a readable color.
      rule(
        [
          '.bg-slate-900 .text-white',
          '.bg-slate-950 .text-white',
          '.bg-indigo-600 .text-white',
          '.bg-indigo-500 .text-white',
        ],
        'color:var(--adm-on-accent)'
      ),

      // Text
      rule(
        ['.text-slate-950', '.text-slate-900', '.text-slate-800', '.hover\\:text-slate-800:hover'],
        'color:var(--adm-text)'
      ),
      rule(['.text-slate-700', '.text-slate-600', '.hover\\:text-slate-700:hover'], `color:${soft}`),
      rule(['.text-slate-500', '.text-slate-400', '.text-slate-300'], `color:${muted}`),
      rule(
        [
          '.text-indigo-600',
          '.text-indigo-700',
          '.text-indigo-800',
          '.hover\\:text-indigo-600:hover',
          '.hover\\:text-indigo-800:hover',
        ],
        'color:var(--adm-accent)'
      ),

      // Borders and dividers
      rule(['.border-slate-50', '.border-slate-100', '.border-slate-200'], `border-color:${line}`),
      rule(['.border-slate-300', '.hover\\:border-slate-300:hover', '.focus\\:border-slate-400:focus'], `border-color:${lineStrong}`),
      rule(['.divide-slate-100 > :not([hidden]) ~ :not([hidden])'], `border-color:${line}`),
      rule(['.border-indigo-200', '.border-indigo-300', '.hover\\:border-indigo-200:hover'], `border-color:${accentLine}`),
      rule(['.border-indigo-600', '.border-indigo-400'], 'border-color:var(--adm-accent)'),

      // Focus rings, file-picker buttons, placeholders
      rule(['.focus-visible\\:outline-indigo-500:focus-visible'], 'outline-color:var(--adm-accent)'),
      rule(['.file\\:bg-indigo-600::file-selector-button'], 'background-color:var(--adm-accent);color:var(--adm-on-accent)'),
      `${P} input::placeholder,${P} textarea::placeholder{color:${muted}}`
    );
  }

  if (!parts.length) return '';
  // Screen only — receipts and shipping labels must always print as designed.
  return `@media screen{${parts.join('')}}`;
}
