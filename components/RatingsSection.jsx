'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Public ratings feed — shown on the website only for signed-OUT visitors.
// Displays ONLY the aggregate star score and the breakdown by star count.
// Individual rating cards (names, comments, and dates) are never shown.
// Updates in realtime via Supabase Realtime (the ratings table is in the
// realtime publication, so a new rating instantly updates the totals).
export default function RatingsSection() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    // Only render this feed for signed-out visitors.
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setSignedIn(!!data.user);
    });

    async function load() {
      const { data } = await supabase
        .from('ratings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (mounted && data) setRatings(data);
      if (mounted) setLoading(false);
    }

    load();

    // Realtime — a new rating appears live without a page refresh.
    const channel = supabase
      .channel('ratings-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ratings' },
        (payload) => {
          if (mounted) setRatings((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Don't show the ratings feed to signed-in users.
  if (signedIn) return null;

  const total = ratings.length;
  const average = total
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
    : '0.0';
  const roundedAvg = Math.round(Number(average));
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratings.filter((r) => r.rating === star).length,
  }));

  return (
    <section className="mt-16 pt-16 border-t border-white/10">
      <h2 className="font-display text-3xl md:text-4xl text-thread mb-8">
        Customer reviews
      </h2>

      {loading ? (
        <p className="text-thread/50 text-sm">Loading ratings…</p>
      ) : total === 0 ? (
        <div className="bg-canvas2 border border-white/5 rounded-sm p-8 text-center">
          <p className="text-thread/60">No ratings yet — be the first to rate us!</p>
        </div>
      ) : (
        <>
          {/* Summary: average + star breakdown */}
          <div className="bg-canvas2 border border-white/5 rounded-sm p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <div className="text-center md:text-left flex-shrink-0">
              <div className="font-mono text-6xl text-gold leading-none">{average}</div>
              <div className="text-gold text-lg tracking-tight mt-2">
                {'★'.repeat(roundedAvg)}
                <span className="text-thread/20">{'★'.repeat(5 - roundedAvg)}</span>
              </div>
              <div className="text-thread/50 text-xs uppercase tracking-widest mt-1">
                {total} review{total === 1 ? '' : 's'}
              </div>
            </div>
<div className="flex-1 w-full max-w-sm">
              {distribution.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-3 text-sm py-0.5">
                  <span className="text-thread/60 w-4 text-right">{star}</span>
                  <span className="text-gold">★</span>
                  <div className="flex-1 h-2 bg-canvas/70 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full"
                      style={{ width: total ? `${(count / total) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-thread/40 font-mono text-xs w-6">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
