import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import ProductForm from '@/components/admin/ProductForm';
import { getProductById } from '@/lib/products';
import { updateProduct } from '@/app/admin/actions';

export default async function EditProductPage({ params }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) redirect('/admin/orders');

  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const boundUpdate = updateProduct.bind(null, product.id);

  return (
    <div>
      <h1 className="font-display text-3xl text-thread mb-8">Edit Product</h1>
      <ProductForm product={product} action={boundUpdate} submitLabel="Save Changes" />
    </div>
  );
}
