import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/products';
import ProductDetail from '@/components/ProductDetail';

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const product = await getProduct(params.slug);
  if (!product) return {};
  return { title: `${product.name} — Stitchhouse` };
}

export default async function ProductPage({ params }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
