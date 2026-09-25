import { createAdminClient } from '@/lib/supabase/server';
import AdminMessagesPanel from '@/components/admin/AdminMessagesPanel';
import { sendStaffMessage, markMessagesReadByStaff } from '@/app/admin/actions';

export const metadata = { title: 'Messages — Admin — Stitchhouse' };

// Only used for the very first paint — from here on, AdminMessagesPanel
// polls /api/admin/messages itself so new messages and conversations
// show up without the page needing a refresh.
export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage({ searchParams }) {
  const params = await searchParams;
  const initialSelectedUserId = params?.user || null;

  const admin = createAdminClient();
  const { data: allMessages } = await admin
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-8">Messages</h1>
      <AdminMessagesPanel
        initialMessages={allMessages || []}
        initialSelectedUserId={initialSelectedUserId}
        sendAction={sendStaffMessage}
        markReadAction={markMessagesReadByStaff}
      />
    </div>
  );
}
