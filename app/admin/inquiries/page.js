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
      <h1 className="font-display text-3xl text-thread mb-8">Inquiries</h1>

      <div className="space-y-4">
        {inquiries?.map((inquiry) => (
          <div
            key={inquiry.id}
            className={`rounded-sm border p-6 ${
              inquiry.read ? 'bg-canvas2 border-white/5' : 'bg-canvas2 border-gold/40'
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-thread/40">#{inquiry.id}</span>
                  <InquiryTypeBadge type={inquiry.type} />
                  {!inquiry.read && <span className="w-2 h-2 rounded-full bg-gold" />}
                </div>
                <div className="font-display text-lg text-thread mt-1">{inquiry.name}</div>
                <div className="text-thread/60 text-sm">
                  <a href={`mailto:${inquiry.email}`} className="text-gold hover:underline">{inquiry.email}</a>
                  {inquiry.phone && <span className="ml-3">📞 {inquiry.phone}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono text-xs text-thread/40">
                  {new Date(inquiry.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {inquiry.subject && (
              <div className="text-thread/70 text-sm font-mono mb-2">📌 {inquiry.subject}</div>
            )}

            <div className="text-thread/70 text-sm leading-relaxed whitespace-pre-wrap bg-canvas/50 rounded-sm p-4 mb-3">
              {inquiry.message}
            </div>

            {inquiry.reply && (
              <div className="border-l-2 border-gold/60 pl-4 mb-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-gold mb-1">
                  Your reply · {new Date(inquiry.replied_at).toLocaleString()}
                </div>
                <div className="text-thread/70 text-sm leading-relaxed whitespace-pre-wrap">
                  {inquiry.reply}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mb-1">
              {!inquiry.read && <MarkInquiryReadButton id={inquiry.id} />}
              <DeleteInquiryButton id={inquiry.id} />
            </div>

            <ReplyForm id={inquiry.id} existingReply={inquiry.reply} />
          </div>
        ))}
        {(!inquiries || inquiries.length === 0) && (
          <div className="bg-canvas2 border border-white/5 rounded-sm p-10 text-center">
            <p className="text-thread/60">No inquiries yet.</p>
            <p className="text-thread/40 text-sm mt-2">
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
    message: 'border-blue-400 text-blue-400',
    feedback: 'border-purple-400 text-purple-400',
    quote: 'border-green-400 text-green-400',
  };
  const labels = {
    message: 'Message',
    feedback: 'Feedback',
    quote: 'Quote Request',
  };
  return (
    <span className={`text-[10px] uppercase tracking-widest border rounded-sm px-2 py-0.5 ${styles[type] || styles.message}`}>
      {labels[type] || type}
    </span>
  );
}
