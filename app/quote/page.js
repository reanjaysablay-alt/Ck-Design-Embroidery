import QuoteForm from '@/components/QuoteForm';

export const metadata = { title: 'Request a Quote — Stitchhouse' };

export default function QuotePage() {
  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-gold mb-3">Business Quote</p>
      <h1 className="font-display text-4xl md:text-5xl text-thread mb-4">
        Tell us what you need stitched.
      </h1>
      <p className="text-thread/60 mb-12 leading-relaxed">
        Fill this in with as much detail as you have — we'll come back with
        pricing, a timeline, and any questions before you commit to anything.
      </p>
      <QuoteForm />
    </div>
  );
}
