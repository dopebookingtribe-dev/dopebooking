"use client";

import { useSyncExternalStore } from "react";
import { MAX_CART_LINES, MAX_LINE_QUANTITY, type CartItem } from "./schemas";

// The cart lives in this browser only (no account needed). Prices are never
// stored here: the server prices every line when the cart is shown.

const KEY = "dopebooking.cart.v1";
const listeners = new Set<() => void>();
const EMPTY: CartItem[] = [];
let cache: { raw: string | null; items: CartItem[] } = {
  raw: null,
  items: EMPTY,
};

function read(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.items;
  let items: CartItem[] = EMPTY;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      items = parsed
        .filter(
          (item): item is CartItem =>
            typeof item?.variantId === "string" &&
            Number.isInteger(item?.quantity) &&
            item.quantity > 0,
        )
        .slice(0, MAX_CART_LINES)
        .map((item) => ({
          variantId: item.variantId,
          quantity: Math.min(item.quantity, MAX_LINE_QUANTITY),
        }));
    }
  } catch {
    items = EMPTY;
  }
  cache = { raw, items };
  return items;
}

function write(items: CartItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Private mode or storage full: the cart just won't persist.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addToCart(variantId: string, quantity: number) {
  const items = read();
  const existing = items.find((item) => item.variantId === variantId);
  const next = existing
    ? items.map((item) =>
        item.variantId === variantId
          ? {
              ...item,
              quantity: Math.min(item.quantity + quantity, MAX_LINE_QUANTITY),
            }
          : item,
      )
    : [
        ...items,
        { variantId, quantity: Math.min(quantity, MAX_LINE_QUANTITY) },
      ].slice(0, MAX_CART_LINES);
  write(next);
}

export function setCartQuantity(variantId: string, quantity: number) {
  write(
    quantity <= 0
      ? read().filter((item) => item.variantId !== variantId)
      : read().map((item) =>
          item.variantId === variantId
            ? { ...item, quantity: Math.min(quantity, MAX_LINE_QUANTITY) }
            : item,
        ),
  );
}

export function replaceCart(items: CartItem[]) {
  write(items);
}

// Music releases sit in their own list: one copy each, no quantities.

const MUSIC_KEY = "dopebooking.music-cart.v1";
export const MAX_MUSIC_LINES = 50;
const NO_MUSIC: string[] = [];
let musicCache: { raw: string | null; ids: string[] } = {
  raw: null,
  ids: NO_MUSIC,
};

function readMusic(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(MUSIC_KEY);
  } catch {
    return NO_MUSIC;
  }
  if (raw === musicCache.raw) return musicCache.ids;
  let ids: string[] = NO_MUSIC;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      ids = [
        ...new Set(
          parsed.filter(
            (id): id is string =>
              typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id),
          ),
        ),
      ].slice(0, MAX_MUSIC_LINES);
    }
  } catch {
    ids = NO_MUSIC;
  }
  musicCache = { raw, ids };
  return ids;
}

function writeMusic(ids: string[]) {
  try {
    window.localStorage.setItem(MUSIC_KEY, JSON.stringify(ids));
  } catch {
    // Private mode or storage full: the cart just won't persist.
  }
  listeners.forEach((listener) => listener());
}

function subscribeMusic(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === MUSIC_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useMusicCart() {
  return useSyncExternalStore(subscribeMusic, readMusic, () => NO_MUSIC);
}

export function addMusicToCart(releaseId: string) {
  const ids = readMusic();
  if (!ids.includes(releaseId)) {
    writeMusic([...ids, releaseId].slice(0, MAX_MUSIC_LINES));
  }
}

export function removeMusicFromCart(releaseId: string) {
  writeMusic(readMusic().filter((id) => id !== releaseId));
}

export function replaceMusicCart(ids: string[]) {
  writeMusic(ids);
}
