/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      // Every "transition-*" utility used across the site (buttons, icons,
      // links — transition-colors, transition-all, transition-transform,
      // etc.) shares this one default duration. Bumping it here makes
      // every clickable element in the app animate over 1 second, without
      // having to touch each component individually.
      transitionDuration: {
        DEFAULT: '1000ms',
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
        display: ['var(--font-fraunces)', 'serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        // Admin-selectable fonts (from Admin → Settings) for the site
        // title, tagline, and hero heading.
        title: ['var(--font-title)', 'serif'],
        tagline: ['var(--font-tagline)', 'sans-serif'],
        heading: ['var(--font-heading)', 'serif'],
      },
      backgroundImage: {
        twill: "repeating-linear-gradient(115deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 2px, transparent 2px, transparent 6px)",
      },
    },
  },
  plugins: [],
};
