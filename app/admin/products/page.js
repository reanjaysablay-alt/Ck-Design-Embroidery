import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { getProducts } from '@/lib/products';
import { deleteProduct } from '@/app/admin/actions';
import DeleteProductButton from '@/components/admin/DeleteProductButton';

export default async function AdminProductsPage() {
  // Product management is admin-only — staff can't reach this even by
  // typing the URL directly (the nav link is already hidden for them).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) redirect('/admin/orders');

  const products = await getProducts();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="bg-indigo-600 text-white font-medium text-sm px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-colors"
        >
          + Add Product
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 px-5">
        {products.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
            <div className="flex-1 min-w-[140px]">
              <div className="text-slate-900 font-medium truncate flex items-center gap-2">
                {p.name}
                {p.inStock === false && (
                  <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full">
                    Out of Stock
                  </span>
                )}
              </div>
              <div className="text-slate-400 text-xs font-mono">{p.slug} · {p.category}</div>
            </div>
            <div className="font-mono text-slate-900 font-medium flex-shrink-0">${p.price}</div>
            <Link
              href={`/admin/products/${p.id}/edit`}
              className="text-indigo-600 text-xs uppercase tracking-widest hover:underline flex-shrink-0"
            >
              Edit
            </Link>
            <DeleteProductButton id={p.id} name={p.name} action={deleteProduct} />
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-slate-500 py-8">No products yet — add your first one.</p>
        )}
      </div>
    </div>
  );
}
