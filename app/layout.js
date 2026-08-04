import { Fraunces, Inter, Space_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CartProvider } from '@/components/CartContext';
import { getSiteSettings } from '@/lib/settings';

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
  };

  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${mono.variable}`} style={themeVars}>
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
