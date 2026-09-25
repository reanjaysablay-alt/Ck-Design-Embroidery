'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const EMPTY_ADDRESS = { line1: '', city: '', emirate: '', phone: '', country: 'United Arab Emirates' };

export default function AccountSettingsForm({ user }) {
  const router = useRouter();

  // --- Nickname (displayed across the site instead of the email) ---
  const [nickname, setNickname] = useState(user.user_metadata?.nickname || '');
  const [savingNickname, setSavingNickname] = useState(false);
  const [savedNickname, setSavedNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState('');

  async function handleSaveNickname(e) {
    e.preventDefault();
    setSavingNickname(true);
    setSavedNickname(false);
    setNicknameError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { nickname: nickname.trim() } });
      if (error) throw error;
      setSavedNickname(true);
      router.refresh();
      setTimeout(() => setSavedNickname(false), 2000);
    } catch (err) {
      setNicknameError(err.message || 'Could not save your nickname. Please try again.');
    } finally {
      setSavingNickname(false);
    }
  }

  // --- Full name (used to fill in "Full name" at checkout) ---
  const [fullName, setFullName] = useState(user.user_metadata?.full_name || '');
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);
  const [nameError, setNameError] = useState('');

  async function handleSaveName(e) {
    e.preventDefault();
    setSavingName(true);
    setSavedName(false);
    setNameError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
      if (error) throw error;
      setSavedName(true);
      router.refresh();
      setTimeout(() => setSavedName(false), 2000);
    } catch (err) {
      setNameError(err.message || 'Could not save your name. Please try again.');
    } finally {
      setSavingName(false);
    }
  }

  // --- Default address, with an optional "use my current location" ---
  // auto-fill. Saved to user_metadata so CheckoutClient can pre-fill
  // the shipping form with it instead of the customer retyping their
  // address on every order.
  const [address, setAddress] = useState({ ...EMPTY_ADDRESS, ...(user.user_metadata?.address || {}) });
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [savedAddress, setSavedAddress] = useState(false);
  const [addressError, setAddressError] = useState('');

  function updateAddress(field, value) {
    setAddress((prev) => ({ ...prev, [field]: value }));
  }

  // Reads the device's GPS location, then reverse-geocodes it (via
  // OpenStreetMap's free Nominatim API — no API key needed) into the
  // address fields below so the customer can just tap a button instead
  // of typing their street address. They can still edit anything it
  // fills in before saving.
  async function handleUseMyLocation() {
    setLocateError('');
    if (!navigator.geolocation) {
      setLocateError('Your browser does not support detecting your location.');
      return;
    }
    setLocating(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      const { latitude, longitude } = position.coords;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) throw new Error('Could not look up an address for your location.');
      const data = await res.json();
      const a = data.address || {};

      const houseNumber = a.house_number ? `${a.house_number} ` : '';
      const street = a.road || a.pedestrian || a.neighbourhood || '';
      const line1 = [houseNumber + street].filter(Boolean).join('') || data.display_name || '';
      const city = a.city || a.town || a.village || a.county || '';
      const emirate = a.state || a.region || '';
      const country = a.country || 'United Arab Emirates';

      setAddress((prev) => ({ ...prev, line1: line1 || prev.line1, city: city || prev.city, emirate: emirate || prev.emirate, country }));
    } catch (err) {
      if (err.code === 1) {
        setLocateError('Location permission was denied — you can still type your address below.');
      } else {
        setLocateError(err.message || 'Could not detect your location. Please enter your address manually.');
      }
    } finally {
      setLocating(false);
    }
  }

  async function handleSaveAddress(e) {
    e.preventDefault();
    setSavingAddress(true);
    setSavedAddress(false);
    setAddressError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: {
          address: {
            line1: address.line1.trim(),
            city: address.city.trim(),
            emirate: address.emirate.trim(),
            phone: address.phone.trim(),
            country: address.country.trim() || 'United Arab Emirates',
          },
        },
      });
      if (error) throw error;
      setSavedAddress(true);
      router.refresh();
      setTimeout(() => setSavedAddress(false), 2000);
    } catch (err) {
      setAddressError(err.message || 'Could not save your address. Please try again.');
    } finally {
      setSavingAddress(false);
    }
  }

  // --- Change password ---
  // Confirms the current password first (via a real sign-in check)
  // before allowing the change, same as any "change password" flow —
  // a signed-in session alone isn't proof someone still has the
  // password, e.g. a shared/unlocked device.
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [savedPassword, setSavedPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError('');
    setSavedPassword(false);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const supabase = createClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        throw new Error('Current password is incorrect.');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setSavedPassword(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSavedPassword(false), 2000);
    } catch (err) {
      setPasswordError(err.message || 'Could not change your password. Please try again.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-14">
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
            disabled={savingNickname}
            className="bg-gold text-ink font-body uppercase tracking-widest text-sm px-6 py-2.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {savingNickname ? 'Saving…' : savedNickname ? 'Saved ✓' : 'Save nickname'}
          </button>
        </div>
        {nicknameError && <p className="text-stitchRed text-xs mt-2">{nicknameError}</p>}
      </form>

      <form onSubmit={handleSaveName}>
        <h2 className="text-xs uppercase tracking-widest text-gold mb-4">Full Name</h2>
        <p className="text-thread/50 text-sm mb-4">
          Used to fill in your name automatically at checkout.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            maxLength={80}
            className="flex-1 bg-canvas2 border border-white/15 rounded-sm px-4 py-2.5 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
          />
          <button
            type="submit"
            disabled={savingName}
            className="bg-gold text-ink font-body uppercase tracking-widest text-sm px-6 py-2.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {savingName ? 'Saving…' : savedName ? 'Saved ✓' : 'Save name'}
          </button>
        </div>
        {nameError && <p className="text-stitchRed text-xs mt-2">{nameError}</p>}
      </form>

      <form onSubmit={handleSaveAddress}>
        <h2 className="text-xs uppercase tracking-widest text-gold mb-4">Default Address</h2>
        <p className="text-thread/50 text-sm mb-4">
          Saved here, this fills in your shipping address automatically at checkout.
        </p>

        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="flex items-center gap-2 border border-gold/50 text-gold font-body uppercase tracking-widest text-xs px-4 py-2.5 rounded-sm hover:bg-gold/10 transition-colors disabled:opacity-60 mb-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
          </svg>
          {locating ? 'Detecting your location…' : 'Use my current location'}
        </button>
        {locateError && <p className="text-stitchRed text-xs mb-3">{locateError}</p>}

        <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mb-4">
          <input
            type="text"
            value={address.line1}
            onChange={(e) => updateAddress('line1', e.target.value)}
            placeholder="Street address"
            className="sm:col-span-2 bg-canvas2 border border-white/15 rounded-sm px-4 py-2.5 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
          />
          <input
            type="text"
            value={address.city}
            onChange={(e) => updateAddress('city', e.target.value)}
            placeholder="City"
            className="bg-canvas2 border border-white/15 rounded-sm px-4 py-2.5 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
          />
          <input
            type="text"
            value={address.emirate}
            onChange={(e) => updateAddress('emirate', e.target.value)}
            placeholder="Emirate"
            className="bg-canvas2 border border-white/15 rounded-sm px-4 py-2.5 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
          />
          <input
            type="tel"
            value={address.phone}
            onChange={(e) => updateAddress('phone', e.target.value)}
            placeholder="Phone"
            className="bg-canvas2 border border-white/15 rounded-sm px-4 py-2.5 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
          />
          <input
            type="text"
            value={address.country}
            onChange={(e) => updateAddress('country', e.target.value)}
            placeholder="Country"
            className="bg-canvas2 border border-white/15 rounded-sm px-4 py-2.5 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
          />
        </div>

        <button
          type="submit"
          disabled={savingAddress}
          className="bg-gold text-ink font-body uppercase tracking-widest text-sm px-6 py-2.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {savingAddress ? 'Saving…' : savedAddress ? 'Saved ✓' : 'Save address'}
        </button>
        {addressError && <p className="text-stitchRed text-xs mt-2">{addressError}</p>}
      </form>

      <form onSubmit={handleChangePassword}>
        <h2 className="text-xs uppercase tracking-widest text-gold mb-4">Change Password</h2>
        <p className="text-thread/50 text-sm mb-4">Must be at least 8 characters.</p>
        <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mb-4">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            required
            className="bg-canvas2 border border-white/15 rounded-sm px-4 py-2.5 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            required
            className="bg-canvas2 border border-white/15 rounded-sm px-4 py-2.5 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            required
            className="bg-canvas2 border border-white/15 rounded-sm px-4 py-2.5 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
          />
        </div>
        <button
          type="submit"
          disabled={savingPassword}
          className="bg-gold text-ink font-body uppercase tracking-widest text-sm px-6 py-2.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {savingPassword ? 'Changing…' : savedPassword ? 'Password changed ✓' : 'Change password'}
        </button>
        {passwordError && <p className="text-stitchRed text-xs mt-2">{passwordError}</p>}
      </form>
    </div>
  );
}
