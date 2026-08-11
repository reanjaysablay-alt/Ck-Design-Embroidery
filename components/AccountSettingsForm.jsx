'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AccountSettingsForm({ user }) {
  const router = useRouter();
  const [nickname, setNickname] = useState(user.user_metadata?.nickname || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function handleSaveNickname(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { nickname: nickname.trim() },
      });
      if (error) throw error;
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err.message || 'Could not save your nickname. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSaveNickname}>
        <h2 className="text-xs uppercase tracking-widest text-gold mb-4">Nickname</h2>
        <p className="text-thread/50 text-sm mb-4">
          This is the name shown across the site instead of your email address.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Your nickname"
            maxLength={40}
            className="flex-1 bg-canvas2 border border-white/15 rounded-sm px-4 py-2.5 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-gold text-ink font-body uppercase tracking-widest text-sm px-6 py-2.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save nickname'}
          </button>
        </div>
        {saveError && <p className="text-stitchRed text-xs mt-2">{saveError}</p>}
      </form>
    </div>
  );
}
