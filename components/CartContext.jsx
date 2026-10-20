'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const CartContext = createContext(null);

// The cart is saved in the browser, so it must be kept PER ACCOUNT.
// (It used to be one shared key, so a brand-new account opened on the same
// browser showed whatever the previous visitor/account had in their cart.)
const STORAGE_PREFIX = 'stitchhouse-cart';
const LEGACY_KEY = 'stitchhouse-cart'; // old shared key - removed on load

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  // undefined = still finding out who is signed in; null = signed out.
  const [userId, setUserId] = useState(undefined);
  // Which storage key `items` was loaded from (guards against saving one
  // account's items under another account's key while switching).
  const [loadedKey, setLoadedKey] = useState(null);

  const storageKey =
    userId === undefined ? null : `${STORAGE_PREFIX}:${userId || 'guest'}`;
  const hydrated = storageKey !== null && loadedKey === storageKey;

  // Track who is signed in.
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setUserId(data?.session?.user?.id || null);
      })
      .catch(() => {
        if (active) setUserId(null);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) setUserId(session?.user?.id || null);
      }
    );

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // Load that account's own cart whenever the signed-in account changes.
  useEffect(() => {
    if (!storageKey) return;

    let loaded = [];
    try {
      window.localStorage.removeItem(LEGACY_KEY);
      const saved = window.localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) loaded = parsed;
    } catch (e) {
      // ignore corrupt storage
    }

    setItems(loaded);
    setLoadedKey(storageKey);
  }, [storageKey]);

  // Save changes to that account's own cart.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      // storage full / blocked - cart still works for this visit
    }
  }, [items, hydrated, storageKey]);

  function addItem(product, options = {}) {
    const qty = options.qty || 1;
    const type = options.type === 'custom' ? 'custom' : 'plain';
    const note = (options.note || '').trim();
    // The uploaded artwork's storage path + original filename (see
    // /api/upload/design). Only ever set for custom items. Kept as a
    // path, not a File, since the cart is persisted to localStorage.
    const design = options.design?.path
      ? { path: options.design.path, name: options.design.name || options.design.path }
      : null;
    setItems((prev) => {
      const key = `${product.slug}-${options.size || 'onesize'}-${type}-${note}-${design?.path || ''}`;
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [
        ...prev,
        {
          key,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.image,
          size: options.size || null,
          type,
          note,
          design,
          qty,
        },
      ];
    });
  }

  function removeItem(key) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateQty(key, qty) {
    if (qty < 1) return removeItem(key);
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)));
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, subtotal, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
