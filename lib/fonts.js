// Font options the admin can choose from in Site Settings for the site
// title, tagline, and hero heading. Each entry maps to a Google Font that
// is loaded in app/layout.js via next/font/google, and a CSS variable used
// by the corresponding Tailwind utility (font-title / font-tagline /
// font-heading).
//
// `variable` is the CSS variable name for the font family.
// `label` is the human-friendly name shown in the admin dropdown.
// `preview` is the text shown in the dropdown's live preview.
export const FONT_OPTIONS = [
  { key: 'fraunces', label: 'Fraunces (serif)', variable: '--font-fraunces' },
  { key: 'inter', label: 'Inter (sans)', variable: '--font-inter' },
  { key: 'playfair', label: 'Playfair Display (serif)', variable: '--font-playfair' },
  { key: 'cormorant', label: 'Cormorant Garamond (serif)', variable: '--font-cormorant' },
  { key: 'montserrat', label: 'Montserrat (sans)', variable: '--font-montserrat' },
  { key: 'oswald', label: 'Oswald (condensed)', variable: '--font-oswald' },
  { key: 'raleway', label: 'Raleway (sans)', variable: '--font-raleway' },
  { key: 'poppins', label: 'Poppins (sans)', variable: '--font-poppins' },
  { key: 'lora', label: 'Lora (serif)', variable: '--font-lora' },
  { key: 'cinzel', label: 'Cinzel (classic)', variable: '--font-cinzel' },
  { key: 'bebas', label: 'Bebas Neue (display)', variable: '--font-bebas' },
  { key: 'greatvibes', label: 'Great Vibes (script)', variable: '--font-great-vibes' },
];

// The default fonts (matching the original design).
export const DEFAULT_FONT_KEY = 'fraunces';

// Given a saved setting value (a font key), return the font option object.
export function getFontOption(key) {
  return FONT_OPTIONS.find((f) => f.key === key) || FONT_OPTIONS[0];
}

