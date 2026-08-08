import Link from 'next/link';
import { getProducts } from '@/lib/products';
import { deleteProduct } from '@/app/admin/actions';
import DeleteProductButton from '@/components/admin/DeleteProductButton';

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl text-thread">Products</h1>
        <Link
          href="/admin/products/new"
          className="bg-gold text-ink font-body uppercase tracking-widest text-sm px-5 py-2.5 rounded-sm hover:bg-thread transition-colors"
        >
          Add Product
        </Link>
      </div>

      <div className="divide-y divide-white/10 border-t border-b border-white/10">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-4 py-4">
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg text-thread truncate">{p.name}</div>
              <div className="text-thread/40 text-xs font-mono">{p.slug} · {p.category}</div>
            </div>
            <div className="font-mono text-thread w-20 text-right">${p.price}</div>
            <Link
              href={`/admin/products/${p.id}/edit`}
              className="text-gold text-xs uppercase tracking-widest hover:underline"
            >
              Edit
            </Link>
            <DeleteProductButton id={p.id} name={p.name} action={deleteProduct} />
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-thread/50 py-8">No products yet — add your first one.</p>
        )}
      </div>
    </div>
  );
}
