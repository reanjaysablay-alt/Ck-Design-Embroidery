import { getProducts } from '@/lib/products';
import { createCashierSale } from '@/app/admin/actions';
import CashierPanel from '@/components/admin/CashierPanel';

export const metadata = { title: 'Cashier — Admin — Stitchhouse' };
export const dynamic = 'force-dynamic';

// Open to staff as well as admins — ringing up an in-person sale is
// routine counter work, same access level as Orders. Auth/staff-gate
// checks already happen in app/admin/layout.js for every /admin/*
// route, so this page doesn't need to repeat them.
export default async function CashierPage() {
  const products = (await getProducts()).filter((p) => p.inStock !== false);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Cashier</h1>
      <p className="text-slate-500 mb-8">
        Ring up an in-person sale — pick items, take cash, done. Recorded the same as any other
        completed order.
      </p>
      <CashierPanel products={products} createSaleAction={createCashierSale} />
    </div>
  );
}
