import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import ProductForm from '@/components/admin/ProductForm';
import { createProduct } from '@/app/admin/actions';

export default async function NewProductPage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) redirect('/admin/orders');

  const params = await searchParams;
  const error = params?.error;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-8">Add Product</h1>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}
      <ProductForm action={createProduct} submitLabel="Create Product" />
    </div>
  );
}
