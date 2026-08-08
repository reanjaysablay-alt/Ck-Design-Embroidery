import Link from 'next/link';
import { getProducts } from '@/lib/products';
import { deleteProduct } from '@/app/admin/actions';
import DeleteProductButton from '@/components/admin/DeleteProductButton';

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-black">Products</h1>
        <Link
          href="/admin/products/new"
          className="bg-black text-white font-medium uppercase tracking-widest text-sm px-5 py-2.5 rounded-md hover:bg-gray-800 transition-colors"
        >
          Add Product
        </Link>
      </div>

      <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-4 py-4">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-black truncate">{p.name}</div>
              <div className="text-gray-500 text-xs">{p.slug} · {p.category}</div>
            </div>
            <div className="font-medium text-black w-20 text-right">${p.price}</div>
            <Link
              href={`/admin/products/${p.id}/edit`}
              className="text-black text-xs uppercase tracking-widest hover:underline"
            >
              Edit
            </Link>
            <DeleteProductButton id={p.id} name={p.name} action={deleteProduct} />
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-gray-500 py-8">No products yet — add your first one.</p>
        )}
      </div>
    </div>
  );
}
