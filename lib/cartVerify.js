import { getProducts } from '@/lib/products';
import { createClient } from '@/lib/supabase/server';

// Re-prices every cart item against the real products table before an
// order is ever created or charged — the browser can send whatever
// price it wants, but that value is discarded and replaced with the
// authoritative one from the database. This runs for every checkout
// path (PayPal, COD, Walk-in) so none of them can be tricked by a
// tampered request.
//
// Also returns `stockDeductions` — the exact {productId, size, qty}
// triples to pass to deductStock() once the order is actually saved.
// Kept separate from the returned `items` (rather than attaching
// product IDs onto each item) so nothing extra leaks into what gets
// stored on the order record.
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
  const stockDeductions = [];

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

    // Per-size stock — a product can be "in stock" overall while a
    // specific size is sold out. Re-check the exact size being
    // ordered, not just the product-level flag.
    if (product.stock && item.size) {
      const available = product.stock[item.size] ?? 0;
      if (available <= 0) {
        throw new Error(`"${product.name}" (size ${item.size}) is sold out.`);
      }
      if (qty > available) {
        throw new Error(`Only ${available} left of "${product.name}" (size ${item.size}).`);
      }
      stockDeductions.push({ productId: product.id, size: item.size, qty });
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

  return { items: verified, total, stockDeductions };
}

// Actually commits the stock deduction — call this ONLY after the
// order has been successfully saved, using the atomic
// decrement_product_stock() Postgres function (see db/schema.sql) so
// concurrent orders for the same size can never oversell it.
//
// Deliberately never throws: if this fails after the order already
// exists, the order should still go through — a stock-count mismatch
// is something to reconcile manually, not a reason to tell the
// customer their (already-charged, for PayPal) order failed.
export async function deductStock(stockDeductions) {
  if (!stockDeductions?.length) return;
  const supabase = await createClient();
  for (const { productId, size, qty } of stockDeductions) {
    const { error } = await supabase.rpc('decrement_product_stock', {
      p_product_id: productId,
      p_size: size,
      p_qty: qty,
    });
    if (error) {
      console.error('Stock deduction failed:', productId, size, qty, error.message);
    }
  }
}

// Reverses a previous deductStock() call — used when an order is
// canceled, so the stock it was holding becomes purchasable again.
// Same never-throws reasoning as deductStock: a cancellation should
// always succeed even if a restore has a hiccup.
export async function restoreStock(stockDeductions) {
  if (!stockDeductions?.length) return;
  const supabase = await createClient();
  for (const { productId, size, qty } of stockDeductions) {
    const { error } = await supabase.rpc('restore_product_stock', {
      p_product_id: productId,
      p_size: size,
      p_qty: qty,
    });
    if (error) {
      console.error('Stock restore failed:', productId, size, qty, error.message);
    }
  }
}
