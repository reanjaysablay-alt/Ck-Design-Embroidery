import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import DeliveryRiderForm, { RemoveRiderButton } from '@/components/admin/DeliveryRiderControls';

export const metadata = { title: 'Delivery Riders — Stitchhouse Admin' };

export const dynamic = 'force-dynamic';

export default async function DeliveryRidersPage() {
  // Full-admin only.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) redirect('/admin/orders');

  const admin = createAdminClient();

  let authUsers = [];
  try {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    authUsers = data?.users || [];
  } catch (err) {
    console.error('Could not list auth users:', err.message);
  }

  const { data: riderRows } = await admin
    .from('delivery_profiles')
    .select('user_id, display_name, phone, vehicle_type, vehicle_plate, active')
    .eq('active', true)
    .order('created_at', { ascending: false });

  const riders = (riderRows || []).map((r) => ({
    ...r,
    email: authUsers.find((u) => u.id === r.user_id)?.email || '',
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Delivery Riders</h1>
      <p className="text-slate-500 mb-10">
        Add a rider by the email they signed up with. They'll see the delivery dashboard when they
        log in.
      </p>

      <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Add a rider</h2>
      <div className="mb-14">
        <DeliveryRiderForm />
      </div>

      <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Active riders</h2>

      {riders.length === 0 ? (
        <p className="text-slate-500">No delivery riders yet.</p>
      ) : (
        <div className="space-y-3">
          {riders.map((r) => (
            <div
              key={r.user_id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm"
            >
              <div>
                <div className="text-slate-900 font-medium">{r.display_name}</div>
                <div className="text-slate-400 text-xs">
                  {[r.email, r.phone, r.vehicle_type, r.vehicle_plate].filter(Boolean).join(' · ')}
                </div>
              </div>
              <RemoveRiderButton userId={r.user_id} name={r.display_name} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}