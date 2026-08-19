import { createAdminClient } from '@/lib/supabase/server';
import { MarkInquiryReadButton, DeleteInquiryButton, ReplyForm } from './client';

export const metadata = { title: 'Inquiries — Admin — Stitchhouse' };

export const dynamic = 'force-dynamic';

// Messages, feedback, and quote requests only — ratings have their own
// page at /admin/ratings.
export default async function AdminInquiriesPage() {
  const admin = createAdminClient();
  const { data: inquiries } = await admin
    .from('contact_inquiries')
    .select('*')
    .neq('type', 'rating')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-8">Inquiries</h1>

      <div className="space-y-4">
        {inquiries?.map((inquiry) => (
          <div
            key={inquiry.id}
            className={`rounded-2xl border p-6 shadow-sm ${
              inquiry.read ? 'bg-white border-slate-200' : 'bg-white border-indigo-300'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">#{inquiry.id}</span>
                  <InquiryTypeBadge type={inquiry.type} />
                  {!inquiry.read && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                </div>
                <div className="text-slate-900 font-medium text-lg mt-1">{inquiry.name}</div>
                <div className="text-slate-500 text-sm">
                  <a href={`mailto:${inquiry.email}`} className="text-indigo-600 hover:underline">{inquiry.email}</a>
                  {inquiry.phone && <span className="ml-3">📞 {inquiry.phone}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono text-xs text-slate-400">
                  {new Date(inquiry.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {inquiry.subject && (
              <div className="text-slate-600 text-sm font-mono mb-2">📌 {inquiry.subject}</div>
            )}

            <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4 mb-3">
              {inquiry.message}
            </div>

            {inquiry.reply && (
              <div className="border-l-2 border-indigo-400 pl-4 mb-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-indigo-600 mb-1">
                  Your reply · {new Date(inquiry.replied_at).toLocaleString()}
                </div>
                <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {inquiry.reply}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-1">
              {!inquiry.read && <MarkInquiryReadButton id={inquiry.id} />}
              <DeleteInquiryButton id={inquiry.id} />
            </div>

            <ReplyForm id={inquiry.id} existingReply={inquiry.reply} />
          </div>
        ))}
        {(!inquiries || inquiries.length === 0) && (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
            <p className="text-slate-600">No inquiries yet.</p>
            <p className="text-slate-400 text-sm mt-2">
              Messages, feedback, and quote requests from customers will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InquiryTypeBadge({ type }) {
  const styles = {
    message: 'border-blue-200 text-blue-700 bg-blue-50',
    feedback: 'border-violet-200 text-violet-700 bg-violet-50',
    quote: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  };
  const labels = {
    message: 'Message',
    feedback: 'Feedback',
    quote: 'Quote Request',
  };
  return (
    <span className={`text-[10px] uppercase tracking-widest border rounded-full px-2 py-0.5 ${styles[type] || styles.message}`}>
      {labels[type] || type}
    </span>
  );
}
