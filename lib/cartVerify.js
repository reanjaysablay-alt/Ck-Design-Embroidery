import { getProducts } from '@/lib/products';

// Re-prices every cart item against the real products table before an
// order is ever created or charged — the browser can send whatever
// price it wants, but that value is discarded and replaced with the
// authoritative one from the database. This runs for every checkout
// path (PayPal, COD, Walk-in) so none of them can be tricked by a
// tampered request.
//
// Throws on anything that would make the order invalid — an unknown
// product, an out-of-stock product, or a nonsensical quantity — so the
// calling route can turn that into a clean 400 response instead of
// silently creating a bad order.
export async function verifyCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart is empty');
  }

  const products = await getProducts();
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const verified = items.map((item) => {
    const product = bySlug.get(item.slug);

    if (!product) {
      throw new Error(`"${item.name || item.slug}" is no longer available.`);
    }
    if (product.inStock === false) {
      throw new Error(`"${product.name}" is currently out of stock.`);
    }

    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
      throw new Error(`Invalid quantity for "${product.name}".`);
    }

    // Everything else about the item (size, note, design upload,
    // custom/plain type) is harmless to trust — it doesn't affect
    // money. Only price ever comes from the database, never the
    // request body. customizationFee is intentionally left alone: it
    // can only be set later by staff through the admin dashboard
    // (setCustomizationFee), never at checkout, so there's nothing to
    // verify here — a tampered incoming customizationFee is simply
    // dropped.
    return {
      ...item,
      name: product.name,
      price: product.price,
      customizationFee: undefined,
    };
  });

  const total = verified
    .reduce((sum, item) => sum + item.price * item.qty, 0)
    .toFixed(2);

  return { items: verified, total };
}
