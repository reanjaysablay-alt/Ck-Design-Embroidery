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
          Stitchhouse runs on the same floor, the same machines, and the same
          crew whether we're producing 300 uniform polos for a client or
          stitching a single hoop of wildflowers for the shop. That's on
          purpose — the craft doesn't change with the order size.
        </p>
        <p className="text-thread/70 text-lg leading-relaxed">
          Replace this paragraph with your client's real story: how the
          business started, who runs the machines, and what makes their
          approach to embroidery different.
        </p>
      </section>
      <StitchDivider />
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16">
        <h2 className="font-display text-2xl text-thread mb-4">Where we work</h2>
        <p className="text-thread/60 leading-relaxed">
          Add address, hours, and a photo of the workshop here once available.
        </p>
      </section>
    </div>
  );
}
