import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import MessageThread from '@/components/MessageThread';

export const metadata = { title: 'Messages — Stitchhouse' };

// Always fresh — a customer opening this page right after a staff
// reply should never see a stale/cached thread.
export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/account/messages');
  if (isAdminEmail(user.email)) redirect('/admin');

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-gold mb-3">Messages</p>
      <h2 className="text-xs uppercase tracking-widest text-gold mb-4">Talk to Us</h2>
      <p className="text-thread/60 mb-8">
        Message our team about an order, a custom design, or anything else you need help with.
      </p>

      <MessageThread userId={user.id} initialMessages={messages || []} />
    </div>
  );
}
