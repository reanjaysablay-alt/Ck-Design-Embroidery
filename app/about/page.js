import StitchDivider from '@/components/StitchDivider';

export const metadata = { title: 'About — Stitchhouse' };

export default function AboutPage() {
  return (
    <div>
      <section className="max-w-3xl mx-auto px-5 md:px-8 pt-20 pb-16">
        <p className="font-mono text-xs uppercase tracking-widest text-gold mb-4">About</p>
        <h1 className="font-display text-4xl md:text-5xl text-thread mb-6">
          One workshop, two kinds of orders.
        </h1>
        <p className="text-thread/70 text-lg leading-relaxed mb-6">
          CK Design Embroidery is a professional computerized embroidery
          provider based in Shabiya 10, Abu Dhabi, UAE. We specialize in
          high-precision custom embroidery for apparel, workwear,
          sportswear, traditional garments, headwear, and patches.
        </p>
        <p className="text-thread/70 text-lg leading-relaxed">
          Our services include embroidery on polos, T-shirts, shirts,
          jackets, safety vests, coveralls, sportswear, karate suits, bath
          robes, night robes, abayas, sheilas, caps, bonnie hats, and
          Velcro patches. We deliver durable, crisp stitching for corporate
          uniforms, teams, and individual custom orders.
        </p>
      </section>
      <StitchDivider />
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16">
        <h2 className="font-display text-2xl text-thread mb-4">Where we work</h2>
        <p className="text-thread/60 leading-relaxed">
          Shabiya 10, Abu Dhabi, United Arab Emirates.
        </p>
      </section>
    </div>
  );
}
