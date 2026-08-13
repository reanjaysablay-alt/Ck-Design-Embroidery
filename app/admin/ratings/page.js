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
      <h1 className="font-display text-3xl text-thread mb-8">Ratings</h1>

      <div className="space-y-4">
        {ratings?.map((rating) => (
          <div
            key={rating.id}
            className={`rounded-sm border p-6 ${
              rating.read ? 'bg-canvas2 border-white/5' : 'bg-canvas2 border-gold/40'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-thread/40">#{rating.id}</span>
                  <span className="text-gold text-sm">{'★'.repeat(rating.rating)}</span>
                  {!rating.read && <span className="w-2 h-2 rounded-full bg-gold" />}
                </div>
                <div className="font-display text-lg text-thread mt-1">{rating.name}</div>
                <div className="text-thread/60 text-sm">
                  <a href={`mailto:${rating.email}`} className="text-gold hover:underline">{rating.email}</a>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono text-xs text-thread/40">
                  {new Date(rating.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {rating.message && (
              <div className="text-thread/70 text-sm leading-relaxed whitespace-pre-wrap bg-canvas/50 rounded-sm p-4 mb-3">
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
          <div className="bg-canvas2 border border-white/5 rounded-sm p-10 text-center">
            <p className="text-thread/60">No ratings yet.</p>
            <p className="text-thread/40 text-sm mt-2">
              Star ratings customers leave will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
