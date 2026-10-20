/** @type {import('tailwindcss').Config} */
module.exports = {
  // The admin Dark Mode switch toggles a `dark` class on <html>.
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      // No animations: every transition-* utility is instant (the global
      // rule at the bottom of app/globals.css also switches off all CSS
      // animations and transitions site-wide, on desktop and mobile).
      transitionDuration: {
        DEFAULT: '0ms',
      },
      colors: {
        canvas: 'var(--color-canvas)',   // raw denim / indigo twill
        canvas2: 'var(--color-canvas2)', // lighter panel on canvas
        linen: 'var(--color-linen)',     // unbleached linen
        linen2: 'var(--color-linen2)',   // deeper linen for cards
        ink: 'var(--color-ink)',         // near-black thread
        gold: 'var(--color-gold)',       // metallic thread gold
        goldDim: 'var(--color-gold-dim)',
        stitchRed: 'var(--color-stitch-red)',
        thread: 'var(--color-thread)',
      },
      fontFamily: {
        display: ['Dirham', 'var(--font-fraunces)', 'serif'],
        body: ['Dirham', 'var(--font-inter)', 'sans-serif'],
        mono: ['Dirham', 'var(--font-mono)', 'monospace'],
        // Admin-selectable fonts (from Admin → Settings) for the site
        // title, tagline, and hero heading.
        title: ['Dirham', 'var(--font-title)', 'serif'],
        tagline: ['Dirham', 'var(--font-tagline)', 'sans-serif'],
        heading: ['Dirham', 'var(--font-heading)', 'serif'],
      },
      backgroundImage: {
        twill: "repeating-linear-gradient(115deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 2px, transparent 2px, transparent 6px)",
      },
    },
  },
  plugins: [],
};
