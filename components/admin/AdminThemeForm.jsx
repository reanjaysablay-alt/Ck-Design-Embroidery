'use client';

import { useState } from 'react';
import {
  ADMIN_THEME_ROLES,
  ADMIN_THEME_FIELD_DEFAULTS,
  ADMIN_FONT_OPTIONS,
  ADMIN_SIZE_MIN,
  ADMIN_SIZE_MAX,
  adminThemeKey,
  getAdminTheme,
} from '@/lib/adminTheme';

const ROLE_LABELS = { admin: 'Admin account', staff: 'Staff accounts' };

const COLOR_FIELDS = [
  { field: 'bg', label: 'Background', hint: 'Page behind the cards' },
  { field: 'panel', label: 'Panels', hint: 'Sidebar, cards, tables' },
  { field: 'text', label: 'Text', hint: 'Main text color' },
  { field: 'accent', label: 'Accent', hint: 'Buttons, active menu, links' },
];

// One-click starting points. They only fill in the four colors.
const PRESETS = [
  { name: 'Default light', bg: '#f8fafc', panel: '#ffffff', text: '#0f172a', accent: '#4f46e5' },
  { name: 'Dark slate', bg: '#0f172a', panel: '#1e293b', text: '#f1f5f9', accent: '#6366f1' },
  { name: 'Midnight', bg: '#0b1220', panel: '#131c2e', text: '#e6edf7', accent: '#38bdf8' },
  { name: 'Warm linen', bg: '#f4efe3', panel: '#fffaf0', text: '#2b2418', accent: '#b8860b' },
  { name: 'Forest', bg: '#f1f5f1', panel: '#ffffff', text: '#1b2b1f', accent: '#15803d' },
  { name: 'Rose', bg: '#fdf2f4', panel: '#ffffff', text: '#3b1a22', accent: '#e11d48' },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Starting values for one role, read from the saved settings.
function initialRole(settings, role) {
  const t = getAdminTheme(settings, role);
  return {
    enabled: t.colorsEnabled,
    bg: t.bg,
    panel: t.panel,
    text: t.text,
    accent: t.accent,
    font: t.fontKey,
    size: t.size,
  };
}

export default function AdminThemeForm({ settings, action }) {
  const [active, setActive] = useState('admin');
  const [values, setValues] = useState(() =>
    Object.fromEntries(ADMIN_THEME_ROLES.map((r) => [r, initialRole(settings, r)]))
  );

  const patch = (role, changes) =>
    setValues((prev) => ({ ...prev, [role]: { ...prev[role], ...changes } }));

  const resetRole = (role) =>
    patch(role, {
      enabled: false,
      bg: ADMIN_THEME_FIELD_DEFAULTS.bg,
      panel: ADMIN_THEME_FIELD_DEFAULTS.panel,
      text: ADMIN_THEME_FIELD_DEFAULTS.text,
      accent: ADMIN_THEME_FIELD_DEFAULTS.accent,
      font: ADMIN_THEME_FIELD_DEFAULTS.font,
      size: Number(ADMIN_THEME_FIELD_DEFAULTS.size),
    });

  const copyToOther = (from) => {
    const to = ADMIN_THEME_ROLES.find((r) => r !== from);
    patch(to, { ...values[from] });
  };

  const otherRole = (role) => ADMIN_THEME_ROLES.find((r) => r !== role);

  return (
    <form action={action} className="max-w-2xl space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl px-4 py-3 text-sm">
        Change how the dashboard looks for the Admin account and for Staff accounts (cashier
        accounts count as Staff). Each one has its own colors, font and text size. Changes apply
        the next time that account opens or refreshes a dashboard page.
      </div>

      {/* Role tabs */}
      <div role="tablist" className="inline-flex rounded-full border border-slate-200 bg-white p-1">
        {ADMIN_THEME_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            role="tab"
            aria-selected={active === role}
            onClick={() => setActive(role)}
            className={`px-5 py-2 rounded-full text-sm font-medium ${
              active === role ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>

      {ADMIN_THEME_ROLES.map((role) => (
        // Both panels stay mounted (just hidden) so every field is always
        // submitted, whichever tab is showing when Save is pressed.
        <div key={role} className={active === role ? 'space-y-8' : 'hidden'}>
          <RolePanel
            role={role}
            v={values[role]}
            onChange={(changes) => patch(role, changes)}
            onReset={() => resetRole(role)}
            onCopy={() => copyToOther(role)}
            copyLabel={`Copy this look to ${ROLE_LABELS[otherRole(role)].toLowerCase()}`}
          />
        </div>
      ))}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="bg-indigo-600 text-white font-medium text-sm px-8 py-3.5 rounded-full hover:bg-indigo-700"
        >
          Save interface theme
        </button>
        <p className="text-slate-400 text-xs">Saves both Admin and Staff looks.</p>
      </div>
    </form>
  );
}

function RolePanel({ role, v, onChange, onReset, onCopy, copyLabel }) {
  const name = (field) => adminThemeKey(role, field);
  const safe = (field) => (HEX_RE.test(v[field]) ? v[field] : ADMIN_THEME_FIELD_DEFAULTS[field]);
  const inputClass =
    'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus-visible:outline-indigo-500';
  const labelClass = 'block text-xs uppercase tracking-widest text-slate-500 mb-2';

  return (
    <>
      {/* ---- Colors ---- */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Colors</h3>

        <input type="hidden" name={name('enabled')} value={v.enabled ? 'true' : 'false'} />
        <label className="flex items-start gap-3 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={v.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            className="mt-1 w-4 h-4 accent-indigo-600"
          />
          <span>
            <span className="block text-slate-800 text-sm font-medium">Use custom colors</span>
            <span className="block text-slate-500 text-xs mt-0.5">
              Off = the standard look, and the account keeps its own Dark Mode switch. On = the
              colors below are used and the Dark Mode switch is hidden for that account.
            </span>
          </span>
        </label>

        <div className={v.enabled ? '' : 'opacity-50'}>
          <div className="flex flex-wrap gap-2 mb-5">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() =>
                  onChange({ enabled: true, bg: p.bg, panel: p.panel, text: p.text, accent: p.accent })
                }
                className="flex items-center gap-2 border border-slate-200 rounded-full pl-2 pr-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                <span
                  className="w-4 h-4 rounded-full border border-slate-200"
                  style={{ background: `linear-gradient(135deg, ${p.panel} 50%, ${p.accent} 50%)` }}
                />
                {p.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COLOR_FIELDS.map((f) => (
              <div key={f.field}>
                <label className={labelClass}>{f.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={safe(f.field)}
                    onChange={(e) => onChange({ [f.field]: e.target.value })}
                    className="w-10 h-10 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer"
                    aria-label={f.label}
                  />
                  <input
                    type="text"
                    name={name(f.field)}
                    value={v[f.field]}
                    onChange={(e) => onChange({ [f.field]: e.target.value })}
                    maxLength={7}
                    spellCheck={false}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-mono text-sm focus-visible:outline-indigo-500"
                  />
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  {HEX_RE.test(v[f.field]) ? f.hint : 'Use a color like #1e293b — the default will be used instead.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Font & size ---- */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Font &amp; text size</h3>

        <div className="space-y-5">
          <div>
            <label className={labelClass}>Font</label>
            <div className="relative">
              <select
                name={name('font')}
                value={v.font}
                onChange={(e) => onChange({ font: e.target.value })}
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                {ADMIN_FONT_OPTIONS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                ▼
              </span>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Text size: <span className="font-mono normal-case tracking-normal">{v.size}%</span>
            </label>
            <input
              type="range"
              name={name('size')}
              min={ADMIN_SIZE_MIN}
              max={ADMIN_SIZE_MAX}
              step={5}
              value={v.size}
              onChange={(e) => onChange({ size: Number(e.target.value) })}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-slate-400 text-xs mt-1">
              <span>Smaller</span>
              <span>Normal (100%)</span>
              <span>Larger</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Live preview ---- */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Preview</h3>
        <Preview v={v} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReset}
          className="h-10 px-4 rounded-full border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
        >
          Reset this look to default
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="h-10 px-4 rounded-full border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
        >
          {copyLabel}
        </button>
      </div>
    </>
  );
}

// A miniature dashboard drawn with the chosen values. Inline styles only —
// it must not pick up the settings page's own colors.
function Preview({ v }) {
  const t = getAdminTheme(
    {
      [adminThemeKey('x', 'enabled')]: String(v.enabled),
      [adminThemeKey('x', 'bg')]: v.bg,
      [adminThemeKey('x', 'panel')]: v.panel,
      [adminThemeKey('x', 'text')]: v.text,
      [adminThemeKey('x', 'accent')]: v.accent,
      [adminThemeKey('x', 'font')]: v.font,
      [adminThemeKey('x', 'size')]: String(v.size),
    },
    'x'
  );
  // Preview uses the standard look when custom colors are off.
  const c = t.colorsEnabled ? t : getAdminTheme({}, 'x');
  const mix = (a, pct, b) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;
  const font = ADMIN_FONT_OPTIONS.find((f) => f.key === t.fontKey);
  const fontFamily = font?.variable ? `var(${font.variable}), sans-serif` : undefined;
  const px = (14 * t.size) / 100;
  const line = mix(c.text, 14, c.panel);
  const muted = mix(c.text, 58, c.panel);

  return (
    <div
      className="keep-light rounded-xl border border-slate-200 overflow-hidden"
      style={{ background: c.bg, color: c.text, fontFamily, fontSize: `${px}px` }}
    >
      <div className="flex">
        <div className="w-36 p-3 space-y-1" style={{ background: c.panel, borderRight: `1px solid ${line}` }}>
          <div className="font-semibold mb-2">Menu</div>
          <div className="rounded-lg px-2 py-1" style={{ background: c.accent, color: c.onAccent }}>
            Orders
          </div>
          <div className="px-2 py-1" style={{ color: muted }}>
            Inquiries
          </div>
          <div className="px-2 py-1" style={{ color: muted }}>
            Revenue
          </div>
        </div>
        <div className="flex-1 p-3">
          <div className="font-semibold mb-2">Orders</div>
          <div className="rounded-lg p-3" style={{ background: c.panel, border: `1px solid ${line}` }}>
            <div className="flex items-center justify-between gap-2">
              <span>Order #1042</span>
              <span style={{ color: c.accent }}>View</span>
            </div>
            <div className="mt-0.5" style={{ color: muted }}>
              Embroidered caps × 24
            </div>
            <div
              className="inline-block rounded-full px-3 py-1 mt-2"
              style={{ background: c.accent, color: c.onAccent }}
            >
              Mark as packed
            </div>
          </div>
        </div>
      </div>
      {!t.colorsEnabled && (
        <p className="px-3 py-2 text-xs" style={{ color: muted, borderTop: `1px solid ${line}` }}>
          Custom colors are off — preview shows the standard look with your font and size.
        </p>
      )}
    </div>
  );
}
