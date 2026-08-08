import { notFound } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';
import { getProductById } from '@/lib/products';
import { updateProduct } from '@/app/admin/actions';

export default async function EditProductPage({ params }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const boundUpdate = updateProduct.bind(null, product.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-black mb-6">Edit Product</h1>
      <ProductForm product={product} action={boundUpdate} submitLabel="Save Changes" />
    </div>
  );
}
