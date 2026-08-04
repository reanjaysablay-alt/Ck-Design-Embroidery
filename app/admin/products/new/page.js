import ProductForm from '@/components/admin/ProductForm';
import { createProduct } from '@/app/admin/actions';

export default function NewProductPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-thread mb-8">Add Product</h1>
      <ProductForm action={createProduct} submitLabel="Create Product" />
    </div>
  );
}
