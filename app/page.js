import Link from 'next/link';
import Image from 'next/image';
import StitchDivider from '@/components/StitchDivider';
import ProductCard from '@/components/ProductCard';
import RatingsSection from '@/components/RatingsSection';
import { getProducts } from '@/lib/products';
import { getSiteSettings } from '@/lib/settings';

export default async function Home() {
  const products = await getProducts();
  const settings = await getSiteSettings();
  const featured = products.slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="relative bg-canvas bg-twill overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 md:px-8 pt-20 pb-24 md:pt-28 md:pb-32">
          <p className="font-tagline text-xs uppercase tracking-[0.25em] text-gold mb-6">
            {settings.site_tagline || 'Est. in a workshop, not a warehouse'}
          </p>

          <h1 className="font-heading text-[13vw] leading-[0.95] md:text-8xl md:leading-[0.92] text-thread max-w-4xl">
            {settings.hero_heading || 'Every logo, stitched to hold.'}
          </h1>

          <svg viewBox="0 0 600 20" className="w-64 md:w-96 mt-6 mb-8" aria-hidden="true">
            <path
              d="M0 10 Q 15 2, 30 10 T 60 10 T 90 10 T 120 10 T 150 10 T 180 10 T 210 10 T 240 10 T 270 10 T 300 10 T 330 10 T 360 10 T 390 10 T 420 10 T 450 10 T 480 10 T 510 10 T 540 10 T 570 10 T 600 10"
              fill="none"
              stroke="#D4A537"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="stitch-draw"
            />
          </svg>

          <p className="text-thread/70 text-lg max-w-xl mb-10 leading-relaxed">
            {settings.hero_subheading || 'We run custom embroidery for businesses who need uniforms, merch, and branded gear done right.'}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/shop"
              className="bg-gold text-ink font-body uppercase tracking-widest text-sm px-7 py-3.5 rounded-sm hover:bg-thread transition-colors"
            >
              Browse the Shop
            </Link>
          </div>
        </div>
      </section>

      <StitchDivider />

      {/* Dual path */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-20 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/services"
          className="group relative bg-canvas2 rounded-sm p-8 md:p-10 overflow-hidden border border-white/5 hover:border-gold/40 transition-colors"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-gold">For Businesses</span>
          <h2 className="font-display text-3xl md:text-4xl text-thread mt-3 mb-4">
            Uniforms, team wear &amp; branded merch
          </h2>
          <p className="text-thread/60 leading-relaxed mb-6">
            Send your logo, tell us the garment count, and we'll digitize,
            sample, and run production with a dedicated turnaround date.
          </p>
          <span className="font-body text-sm uppercase tracking-widest text-gold group-hover:underline">
            Start a quote →
          </span>
        </Link>

        <Link
          href="/shop"
          className="group relative bg-canvas2 rounded-sm p-8 md:p-10 overflow-hidden border border-white/5 hover:border-gold/40 transition-colors"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-gold">For Everyone Else</span>
          <h2 className="font-display text-3xl md:text-4xl text-thread mt-3 mb-4">
            Ready-made embroidered goods
          </h2>
          <p className="text-thread/60 leading-relaxed mb-6">
            Hoop art, totes, patches, and apparel — stitched in small batches
            and shipped from the same workshop that runs our business orders.
          </p>
          <span className="font-body text-sm uppercase tracking-widest text-gold group-hover:underline">
            Browse products →
          </span>
        </Link>
      </section>

      <StitchDivider />

      {/* Featured products */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-20">
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-display text-3xl md:text-4xl text-thread">
            From the shop
          </h2>
          <Link href="/shop" className="text-sm uppercase tracking-widest text-gold hover:underline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {featured.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      <StitchDivider />

      {/* Process strip */}
      <section className="bg-linen text-ink py-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <h2 className="font-display text-3xl md:text-4xl mb-12">How a business order runs</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {[
              { label: 'Send your logo', body: 'Vector file or even a rough sketch — we take it from there.' },
              { label: 'We digitize & sample', body: 'A stitched proof comes back to you before full production starts.' },
              { label: 'You approve', body: 'One round of revisions included on every order.' },
              { label: 'We run production', body: 'Garments arrive on the date we quote, boxed and ready to distribute.' },
            ].map((step) => (
              <div key={step.label}>
                <div className="font-mono text-xs text-stitchRed mb-3">{step.label}</div>
                <p className="text-ink/70 leading-relaxed text-sm">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Public ratings — live star score + full list. Works for signed-out
          visitors too (the ratings table has a public read policy). */}
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <RatingsSection />
      </div>
    </>
  );
}
