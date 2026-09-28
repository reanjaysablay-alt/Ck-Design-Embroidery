import { redirect } from 'next/navigation';

// Sales was merged into the Dashboard — send anyone with this URL
// bookmarked (or an old link somewhere) straight there.
export default function AdminSalesRedirect() {
  redirect('/admin');
}
