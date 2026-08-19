import { redirect } from 'next/navigation';

// Settings has been removed from the admin dashboard — this route is
// kept only so an old bookmark/link doesn't 404, and just bounces
// straight to Orders.
export default function AdminSettingsPage() {
  redirect('/admin/orders');
}
