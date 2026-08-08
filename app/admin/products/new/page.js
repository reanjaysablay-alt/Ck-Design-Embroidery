import ProductForm from '@/components/admin/ProductForm';
import { createProduct } from '@/app/admin/actions';

export default async function NewProductPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-black mb-6">Add Product</h1>
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-md px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}
      <ProductForm action={createProduct} submitLabel="Create Product" />
    </div>
  );
}
