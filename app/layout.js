import {
  Fraunces,
  Inter,
  Space_Mono,
  Playfair_Display,
  Cormorant_Garamond,
  Montserrat,
  Oswald,
  Raleway,
  Poppins,
  Lora,
  Cinzel,
  Bebas_Neue,
  Great_Vibes,
} from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CartProvider } from '@/components/CartContext';
import { getSiteSettings } from '@/lib/settings';
import { getFontOption } from '@/lib/fonts';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const mono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '700'],
  display: 'swap',
});

// Additional fonts selectable in Admin → Settings for the site title,
// tagline, and hero heading. Each exposes a CSS variable used by the
// font-title / font-tagline / font-heading Tailwind utilities.
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-cormorant', display: 'swap' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' });
const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald', display: 'swap' });
const raleway = Raleway({ subsets: ['latin'], variable: '--font-raleway', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora', display: 'swap' });
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', display: 'swap' });
const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas', display: 'swap' });
const greatVibes = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--font-great-vibes', display: 'swap' });

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return {
    title: `${settings.site_title} — ${settings.site_tagline || 'Custom Embroidery & Shop'}`,
    description:
      'Custom logo embroidery for businesses, plus a shop of ready-made embroidered goods. Get a quote or browse the store.',
  };
}

export default async function RootLayout({ children }) {
  const settings = await getSiteSettings();

  // Injected as CSS variables so every Tailwind color utility resolves
  // against the admin-configured theme at runtime.
  const themeVars = {
    '--color-canvas': settings.color_canvas,
    '--color-canvas2': settings.color_canvas2,
    '--color-linen': settings.color_linen,
    '--color-linen2': settings.color_linen2,
    '--color-ink': settings.color_ink,
    '--color-gold': settings.color_gold,
    '--color-gold-dim': settings.color_goldDim || settings.color_gold,
    '--color-stitch-red': settings.color_stitchRed,
    '--color-thread': settings.color_thread,
    // Admin-selected fonts, mapped to the font-title/font-tagline/font-heading
    // Tailwind utilities via the CSS variable of the chosen font.
    '--font-title': `var(${getFontOption(settings.title_font).variable})`,
    '--font-tagline': `var(${getFontOption(settings.tagline_font).variable})`,
    '--font-heading': `var(${getFontOption(settings.heading_font).variable})`,
  };

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${mono.variable} ${playfair.variable} ${cormorant.variable} ${montserrat.variable} ${oswald.variable} ${raleway.variable} ${poppins.variable} ${lora.variable} ${cinzel.variable} ${bebas.variable} ${greatVibes.variable}`}
      style={themeVars}
    >
      <body className="font-body bg-canvas text-thread">
        <CartProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
