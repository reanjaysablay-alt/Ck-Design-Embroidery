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

  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Could not delete your account.');

      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (err) {
      setDeleteError(err.message || 'Could not delete your account. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-14">
      {/* Nickname */}
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

      {/* Danger zone */}
      <div className="border border-stitchRed/30 rounded-sm p-6">
        <h2 className="text-xs uppercase tracking-widest text-stitchRed mb-4">Danger zone</h2>
        <p className="text-thread/60 text-sm mb-1">
          Deleting your account permanently removes your login and personal profile.
        </p>
        <p className="text-thread/40 text-xs mb-5">
          Your past orders are kept as business records (we're required to retain
          transaction history) but will no longer be linked to a login you can
          access. This cannot be undone.
        </p>

        <label className="block text-thread/40 uppercase tracking-widest text-xs mb-2">
          Type DELETE to confirm
        </label>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md">
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="flex-1 bg-canvas2 border border-white/15 rounded-sm px-4 py-2.5 text-thread placeholder:text-thread/30 focus-visible:outline-stitchRed"
          />
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={confirmText !== 'DELETE' || deleting}
            className="bg-stitchRed text-thread font-body uppercase tracking-widest text-sm px-6 py-2.5 rounded-sm hover:bg-stitchRed/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {deleting ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
        {deleteError && <p className="text-stitchRed text-xs mt-2">{deleteError}</p>}
      </div>
    </div>
  );
}
