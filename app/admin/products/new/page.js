import ProductForm from '@/components/admin/ProductForm';
import { createProduct } from '@/app/admin/actions';

export default async function NewProductPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div>
      <h1 className="font-display text-3xl text-thread mb-8">Add Product</h1>
      {error && (
        <div className="bg-stitchRed/10 border border-stitchRed text-stitchRed rounded-sm px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}
      <ProductForm action={createProduct} submitLabel="Create Product" />
    </div>
  );
}
