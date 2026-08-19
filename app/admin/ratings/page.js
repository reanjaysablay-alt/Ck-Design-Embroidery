import { createAdminClient } from '@/lib/supabase/server';
import { MarkInquiryReadButton, DeleteInquiryButton } from '../inquiries/client';

export const metadata = { title: 'Ratings — Admin — Stitchhouse' };

export const dynamic = 'force-dynamic';

// Star ratings only — separated out from message/feedback/quote
// inquiries at /admin/inquiries. Ratings don't get a reply feature;
// they're a public star rating + optional comment, not a conversation.
export default async function AdminRatingsPage() {
  const admin = createAdminClient();
  const { data: ratings } = await admin
    .from('contact_inquiries')
    .select('*')
    .eq('type', 'rating')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-8">Ratings</h1>

      <div className="space-y-4">
        {ratings?.map((rating) => (
          <div
            key={rating.id}
            className={`rounded-2xl border p-6 shadow-sm ${
              rating.read ? 'bg-white border-slate-200' : 'bg-white border-indigo-300'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">#{rating.id}</span>
                  <span className="text-amber-500 text-sm">{'★'.repeat(rating.rating)}</span>
                  {!rating.read && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                </div>
                <div className="text-slate-900 font-medium text-lg mt-1">{rating.name}</div>
                <div className="text-slate-500 text-sm">
                  <a href={`mailto:${rating.email}`} className="text-indigo-600 hover:underline">{rating.email}</a>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono text-xs text-slate-400">
                  {new Date(rating.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {rating.message && (
              <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4 mb-3">
                {rating.message}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!rating.read && <MarkInquiryReadButton id={rating.id} />}
              <DeleteInquiryButton id={rating.id} />
            </div>
          </div>
        ))}
        {(!ratings || ratings.length === 0) && (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
            <p className="text-slate-600">No ratings yet.</p>
            <p className="text-slate-400 text-sm mt-2">
              Star ratings customers leave will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
