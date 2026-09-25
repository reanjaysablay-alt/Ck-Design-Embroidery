// Orders count as a "sale" once they're actually fulfilled — pending
// or in-progress orders aren't revenue yet, and canceled orders never
// were. This matches Completed (delivery pipeline) and Picked Up
// (walk-in pipeline). Shared by app/admin/sales/page.js (the initial
// server-rendered snapshot) and /api/admin/sales/top-products (the
// live-polled ranking) so both agree on what counts as a sale.
export const SALE_STATUSES = ['completed', 'picked_up'];

// Aggregates a set of sale orders' line items into a Top Products
// ranking by revenue.
export function computeTopProducts(orders, limit = 5) {
  const productTotals = new Map();
  for (const o of orders) {
    for (const item of o.items || []) {
      const key = item.name;
      const revenue = Number(item.price || 0) * Number(item.qty || 0) + Number(item.customizationFee || 0);
      const existing = productTotals.get(key) || { name: key, revenue: 0, qty: 0 };
      existing.revenue += revenue;
      existing.qty += Number(item.qty || 0);
      productTotals.set(key, existing);
    }
  }
  return [...productTotals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}
