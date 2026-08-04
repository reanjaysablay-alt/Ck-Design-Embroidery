import Link from 'next/link';
import StitchDivider from '@/components/StitchDivider';

export const metadata = { title: 'Custom Embroidery for Business — Stitchhouse' };

const TIERS = [
  {
    name: 'Small Batch',
    range: '12–49 pieces',
    body: 'Team wear, event shirts, small office runs. One garment style, one placement.',
  },
  {
    name: 'Standard Run',
    range: '50–249 pieces',
    body: 'Uniform rollouts, staff apparel, retail merch drops across mixed sizes.',
  },
  {
    name: 'Bulk Production',
    range: '250+ pieces',
    body: 'Franchise or multi-location orders with volume pricing and staged delivery.',
  },
];

export default function ServicesPage() {
  return (
    <div>
      <section className="bg-canvas bg-twill px-5 md:px-8 pt-20 pb-16">
        <div className="max-w-6xl mx-auto">
          <p className="font-mono text-xs uppercase tracking-widest text-gold mb-4">For Businesses</p>
          <h1 className="font-display text-5xl md:text-6xl text-thread max-w-3xl mb-6">
            Your logo, embroidered right, on schedule.
          </h1>
          <p className="text-thread/70 text-lg max-w-xl mb-10 leading-relaxed">
            We handle digitizing, sampling, and production for uniforms,
            team wear, and branded merch — with one point of contact from
            quote to delivery.
          </p>
          <Link
            href="/quote"
            className="inline-block bg-gold text-ink font-body uppercase tracking-widest text-sm px-7 py-3.5 rounded-sm hover:bg-thread transition-colors"
          >
            Request a Quote
          </Link>
        </div>
      </section>

      <StitchDivider />

      <section className="max-w-6xl mx-auto px-5 md:px-8 py-20">
        <h2 className="font-display text-3xl md:text-4xl text-thread mb-12">Order sizes we run</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div key={tier.name} className="bg-canvas2 rounded-sm p-8 border border-white/5">
              <div className="font-mono text-xs text-gold uppercase tracking-widest mb-2">{tier.range}</div>
              <h3 className="font-display text-2xl text-thread mb-3">{tier.name}</h3>
              <p className="text-thread/60 leading-relaxed text-sm">{tier.body}</p>
            </div>
          ))}
        </div>
      </section>

      <StitchDivider />

      <section className="bg-linen text-ink py-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-6">What we embroider</h2>
            <ul className="space-y-3 text-ink/70 leading-relaxed">
              <li>Polos, button-downs & staff uniforms</li>
              <li>Hats, beanies & visors</li>
              <li>Jackets, hoodies & outerwear</li>
              <li>Bags, aprons & totes</li>
              <li>Patches — sew-on or iron-on</li>
            </ul>
          </div>
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-6">Good to know</h2>
            <ul className="space-y-3 text-ink/70 leading-relaxed">
              <li>Free digitizing on orders of 25+ pieces</li>
              <li>One stitched sample sent for approval before full production</li>
              <li>Standard turnaround is 10–15 business days after approval</li>
              <li>Rush production available — ask when you request your quote</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
