import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/formatDate';
import MessagesThread from '@/components/admin/MessagesThread';
import { sendStaffMessage } from '@/app/admin/actions';

export const metadata = { title: 'Messages — Admin — Stitchhouse' };

export const dynamic = 'force-dynamic';

// Two-pane inbox: a conversation list (one row per customer, grouped
// client-side from the flat messages table) on the left, and the
// selected thread on the right — selection lives in the URL
// (?user=<id>) so a link/refresh keeps the same conversation open.
export default async function AdminMessagesPage({ searchParams }) {
  const params = await searchParams;
  const selectedUserId = params?.user || null;

  const admin = createAdminClient();
  const { data: allMessages } = await admin
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  const conversations = groupConversations(allMessages || []);
  const selected = selectedUserId
    ? (allMessages || []).filter((m) => m.user_id === selectedUserId)
    : [];
  const selectedConversation = conversations.find((c) => c.userId === selectedUserId);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-8">Messages</h1>

      <div className="flex flex-col md:flex-row gap-6 h-[75vh]">
        <div className="w-full md:w-80 flex-shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-y-auto">
          {conversations.length === 0 && (
            <p className="text-slate-400 text-sm text-center p-8">
              No customer messages yet.
            </p>
          )}
          {conversations.map((c) => (
            <Link
              key={c.userId}
              href={`/admin/messages?user=${c.userId}`}
              className={`block px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${
                c.userId === selectedUserId
                  ? 'bg-indigo-50 dark:bg-indigo-950'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-900 dark:text-slate-100 text-sm font-medium truncate">
                  {c.customerEmail || 'Customer'}
                </span>
                {c.unreadCount > 0 && (
                  <span className="flex-shrink-0 bg-indigo-600 text-white text-[10px] font-mono rounded-full w-5 h-5 flex items-center justify-center">
                    {c.unreadCount > 9 ? '9+' : c.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs truncate mt-0.5">
                {c.lastSenderRole === 'staff' ? 'You: ' : ''}
                {c.lastBody}
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-mono mt-1">
                {formatDateTime(c.lastAt)}
              </p>
            </Link>
          ))}
        </div>

        <div className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          {selectedUserId ? (
            <MessagesThread
              userId={selectedUserId}
              customerEmail={selectedConversation?.customerEmail}
              messages={selected}
              sendAction={sendStaffMessage}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-center px-8">
              <p className="text-slate-400">Select a conversation to view and reply.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function groupConversations(messages) {
  const byUser = new Map();
  for (const m of messages) {
    const existing = byUser.get(m.user_id);
    if (!existing) {
      byUser.set(m.user_id, {
        userId: m.user_id,
        customerEmail: m.customer_email,
        lastBody: m.body,
        lastAt: m.created_at,
        lastSenderRole: m.sender_role,
        unreadCount: m.sender_role === 'customer' && !m.read_by_staff ? 1 : 0,
      });
    } else {
      existing.lastBody = m.body;
      existing.lastAt = m.created_at;
      existing.lastSenderRole = m.sender_role;
      existing.customerEmail = m.customer_email || existing.customerEmail;
      if (m.sender_role === 'customer' && !m.read_by_staff) existing.unreadCount += 1;
    }
  }
  return Array.from(byUser.values()).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
}
