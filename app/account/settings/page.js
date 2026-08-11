import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import AccountSettingsForm from '@/components/AccountSettingsForm';

export const metadata = { title: 'Account Settings — Stitchhouse' };

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/account/settings');
  if (isAdminEmail(user.email)) redirect('/admin');

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-gold mb-3">Account</p>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-4xl text-thread">Settings</h1>
        <Link href="/account" className="text-thread/50 hover:text-gold text-sm">
          ← Back to account
        </Link>
      </div>
      <p className="text-thread/50 text-sm mb-10">{user.email}</p>

      <AccountSettingsForm user={user} />
    </div>
  );
}
