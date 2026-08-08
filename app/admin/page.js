import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export default async function AdminHome() {
  const admin = createAdminClient();
  const { count: pendingCount } = await admin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('order_status', 'pending');

  const { count: unreadInquiries } = await admin
    .from('contact_inquiries')
    .select('*', { count: 'exact', head: true })
    .eq('read', false);

  const supabase = await createClient();
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-black mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/orders"
          className="bg-gray-50 border border-gray-200 rounded-md p-6 hover:border-black transition-colors"
        >
          <div className="text-3xl font-bold text-black mb-1">{pendingCount ?? 0}</div>
          <div className="text-sm text-gray-600">Orders awaiting review</div>
        </Link>
        <Link
          href="/admin/inquiries"
          className="bg-gray-50 border border-gray-200 rounded-md p-6 hover:border-black transition-colors"
        >
          <div className="text-3xl font-bold text-black mb-1">{unreadInquiries ?? 0}</div>
          <div className="text-sm text-gray-600">Unread inquiries</div>
        </Link>
        <Link
          href="/admin/products"
          className="bg-gray-50 border border-gray-200 rounded-md p-6 hover:border-black transition-colors"
        >
          <div className="text-3xl font-bold text-black mb-1">{productCount ?? 0}</div>
          <div className="text-sm text-gray-600">Products in the shop</div>
        </Link>
      </div>
    </div>
  );
}
