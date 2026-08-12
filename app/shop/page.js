import ProductCard from '@/components/ProductCard';
import { getProducts } from '@/lib/products';

export const metadata = { title: 'Shop — Stitchhouse' };
export const revalidate = 0;

export default async function ShopPage() {
  const products = await getProducts();

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-gold mb-3">Shop</p>
      <h1 className="font-display text-4xl md:text-5xl text-thread mb-4">Ready-made pieces</h1>
      <p className="text-thread/60 max-w-xl mb-12 leading-relaxed">
        Stitched in small batches between business orders. If you don't see
        what you want, we can likely make it — get a custom quote instead.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
      {products.length === 0 && (
        <p className="text-thread/50">Nothing in the shop yet — check back soon.</p>
      )}
    </div>
  );
}
