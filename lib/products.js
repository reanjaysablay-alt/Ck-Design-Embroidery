import { createClient } from '@/lib/supabase/server';

export async function getProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getProducts error:', error);
    return [];
  }
  return data.map(mapProduct);
}

export async function getProduct(slug) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;
  return mapProduct(data);
}

export async function getProductById(id) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapProduct(data);
}

// Normalize DB column names (stitch_count) to the shape components
// already expect (stitchCount), so ProductCard/ProductDetail/etc need
// no changes.
function mapProduct(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price: Number(row.price),
    category: row.category,
    image: row.image,
    description: row.description,
    stitchCount: row.stitch_count,
    threads: row.threads || [],
    sizes: row.sizes || null,
    inStock: row.in_stock ?? true,
  };
}
