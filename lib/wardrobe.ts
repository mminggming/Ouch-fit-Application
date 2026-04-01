// lib/wardrobe.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY = 'wardrobeItems';

/* -----------------------------------------
 * TYPES
 * ----------------------------------------- */
export interface WardrobeItem {
  id: string;
  name: string;
  brand: string;
  color: string;
  size?: string;
  price?: number;
  imageUri: string;
  category?: string;
  season?: string;
  fabric?: string;
  location?: string[];
  datePurchased?: string;
  tags?: string[];
}

/* -----------------------------------------
 * INTERNAL HELPERS
 * ----------------------------------------- */
function safeParse(raw: string | null): WardrobeItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function save(items: WardrobeItem[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/* -----------------------------------------
 * LOAD ALL
 * ----------------------------------------- */
export async function loadWardrobe(): Promise<WardrobeItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return safeParse(raw);
  } catch (err) {
    console.error('❌ loadWardrobe error:', err);
    return [];
  }
}

/** alias (backward compatibility) */
export const loadItems = loadWardrobe;

/* -----------------------------------------
 * GET ONE
 * ----------------------------------------- */
export async function getItemById(id: string): Promise<WardrobeItem | null> {
  if (!id) return null;

  try {
    const items = await loadWardrobe();
    return items.find((i) => i.id === id) ?? null;
  } catch (err) {
    console.error('❌ getItemById error:', err);
    return null;
  }
}

/* -----------------------------------------
 * ADD ITEM
 * ----------------------------------------- */
export async function addItem(item: WardrobeItem) {
  try {
    const items = await loadWardrobe();

    // prevent duplicate id
    if (items.some((i) => i.id === item.id)) {
      console.warn('⚠️ addItem: duplicate id, skipping.', item.id);
      return;
    }

    items.push(item);
    await save(items);

    console.log('✅ Added item:', item.id);
  } catch (err) {
    console.error('❌ addItem error:', err);
  }
}

/* -----------------------------------------
 * UPDATE ITEM
 * (MERGE, DO NOT OVERWRITE undefined / null)
 * ----------------------------------------- */
export async function updateItem(updated: WardrobeItem) {
  try {
    const items = await loadWardrobe();
    const idx = items.findIndex((i) => i.id === updated.id);

    if (idx === -1) {
      console.warn('⚠️ updateItem: item not found:', updated.id);
      return;
    }

    const merged: WardrobeItem = {
      ...items[idx],
      ...Object.fromEntries(
        Object.entries(updated).filter(
          ([_, v]) => v !== undefined && v !== null
        )
      ),
    };

    items[idx] = merged;
    await save(items);

    console.log('✏️ Updated item:', updated.id);
  } catch (err) {
    console.error('❌ updateItem error:', err);
  }
}

/* -----------------------------------------
 * REMOVE ITEM
 * ----------------------------------------- */
export async function removeItem(id: string) {
  if (!id) return;

  try {
    const items = await loadWardrobe();
    const next = items.filter((i) => i.id !== id);

    if (next.length === items.length) {
      console.warn('⚠️ removeItem: id not found:', id);
      return;
    }

    await save(next);
    console.log('🗑️ Removed item:', id);
  } catch (err) {
    console.error('❌ removeItem error:', err);
  }
}
