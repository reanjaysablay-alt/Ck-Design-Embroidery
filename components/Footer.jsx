import Link from 'next/link';
import StitchDivider from './StitchDivider';
import { getSiteSettings } from '@/lib/settings';

export default async function Footer() {
  const settings = await getSiteSettings();
  const siteTitle = settings.site_title || 'Stitchhouse';

  return (
    <footer className="bg-canvas mt-24">
      <StitchDivider />
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="font-display italic text-2xl text-thread mb-3">{siteTitle}</div>
          <p className="text-thread/60 text-sm leading-relaxed">
            Custom embroidery for brands, teams, and events — plus a shop of
            ready-made pieces, stitched in-house.
          </p>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-gold mb-4">Shop</div>
          <ul className="space-y-2 text-sm text-thread/70">
            <li><Link href="/shop" className="hover:text-gold">All Products</Link></li>
            <li><Link href="/cart" className="hover:text-gold">Cart</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-gold mb-4">Business</div>
          <ul className="space-y-2 text-sm text-thread/70">
            <li><Link href="/services" className="hover:text-gold">Custom Embroidery</Link></li>
            <li><Link href="/quote" className="hover:text-gold">Request a Quote</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-gold mb-4">Studio</div>
          <ul className="space-y-2 text-sm text-thread/70">
            <li><Link href="/about" className="hover:text-gold">About</Link></li>
            <li><Link href="/contact" className="hover:text-gold">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-thread/40 font-mono">
        © {new Date().getFullYear()} CK Design Embroidery, Shabiya 10, Abu Dhabi, UAE
      </div>
    </footer>
  );
}
