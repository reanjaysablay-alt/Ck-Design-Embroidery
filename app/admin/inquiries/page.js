import { createAdminClient } from '@/lib/supabase/server';
import { MarkInquiryReadButton, DeleteInquiryButton } from './client';

export const metadata = { title: 'Inquiries — Admin' };

export const dynamic = 'force-dynamic';

export default async function AdminInquiriesPage() {
  const admin = createAdminClient();
  const { data: inquiries } = await admin
    .from('contact_inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-black mb-6">Inquiries</h1>

      <div className="space-y-4">
        {inquiries?.map((inquiry) => (
          <div
            key={inquiry.id}
            className={`rounded-md border p-6 ${
              inquiry.read ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">#{inquiry.id}</span>
                  <InquiryTypeBadge type={inquiry.type} />
                  {inquiry.rating && <span className="text-yellow-500 text-sm">{'★'.repeat(inquiry.rating)}</span>}
                  {!inquiry.read && <span className="w-2 h-2 rounded-full bg-black" />}
                </div>
                <div className="font-semibold text-lg text-black mt-1">{inquiry.name}</div>
                <div className="text-gray-600 text-sm">
                  <a href={`mailto:${inquiry.email}`} className="text-black hover:underline">{inquiry.email}</a>
                  {inquiry.phone && <span className="ml-3">📞 {inquiry.phone}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-gray-500">
                  {new Date(inquiry.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {inquiry.subject && (
              <div className="text-gray-700 text-sm font-medium mb-2">📌 {inquiry.subject}</div>
            )}

            <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap bg-white border border-gray-200 rounded-md p-4 mb-3">
              {inquiry.message}
            </div>

            <div className="flex gap-3">
              {!inquiry.read && <MarkInquiryReadButton id={inquiry.id} />}
              <DeleteInquiryButton id={inquiry.id} />
            </div>
          </div>
        ))}
        {(!inquiries || inquiries.length === 0) && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-10 text-center">
            <p className="text-gray-600">No inquiries yet.</p>
            <p className="text-gray-500 text-sm mt-2">
              Messages, feedback, ratings, and quote requests from customers will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InquiryTypeBadge({ type }) {
  const styles = {
    message: 'border-gray-500 text-gray-500',
    feedback: 'border-purple-500 text-purple-500',
    rating: 'border-black text-black',
    quote: 'border-green-600 text-green-600',
  };
  const labels = {
    message: 'Message',
    feedback: 'Feedback',
    rating: 'Rating',
    quote: 'Quote Request',
  };
  return (
    <span className={`text-[10px] uppercase tracking-widest border rounded-sm px-2 py-0.5 ${styles[type] || styles.message}`}>
      {labels[type] || type}
    </span>
  );
}
