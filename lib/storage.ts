import * as FS from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "@/app/config/firebaseConfig";

/* ---------------------------------------------------
 * Helpers
 * --------------------------------------------------- */

function requireUserId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User not logged in");
  return uid;
}

function getBaseDir(): string {
  const anyFS = FS as any;
  const base: string | undefined =
    anyFS.documentDirectory ||
    anyFS.cacheDirectory ||
    FS.documentDirectory ||
    FS.cacheDirectory;

  if (!base) throw new Error("No writable directory");
  return base.endsWith("/") ? base : base + "/";
}

function userDir(userId: string) {
  return `${getBaseDir()}users/${userId}/`;
}

function wardrobeKey(userId: string) {
  return `wardrobe:${userId}`;
}

function looksKey(userId: string) {
  return `looks:${userId}`;
}

/* ---------------------------------------------------
 * User directory setup
 * --------------------------------------------------- */

export async function ensureUserDirs() {
  const userId = requireUserId();
  const dirs = [
    userDir(userId),
    `${userDir(userId)}images`,
    `${userDir(userId)}wardrobe`,
  ];

  for (const dir of dirs) {
    const info = await FS.getInfoAsync(dir);
    if (!info.exists) {
      await FS.makeDirectoryAsync(dir, { intermediates: true });
    }
  }
}

/* ---------------------------------------------------
 * Image handling (สำคัญมาก)
 * --------------------------------------------------- */

export async function saveImageToApp(sourceUri: string) {
  const userId = requireUserId();
  await ensureUserDirs();

  const ext = sourceUri.split(".").pop() || "jpg";
  const filename = `${Date.now()}.${ext}`;
  const dest = `${userDir(userId)}images/${filename}`;

  await FS.copyAsync({
    from: sourceUri,
    to: dest,
  });

  return dest; // path ใหม่ใน app
}

/* ---------------------------------------------------
 * WARDROBE
 * --------------------------------------------------- */

export async function loadItemList(): Promise<any[]> {
  try {
    const userId = requireUserId();
    const raw = await AsyncStorage.getItem(wardrobeKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("loadItemList error:", err);
    return [];
  }
}

export async function saveItemList(list: any[]) {
  try {
    const userId = requireUserId();
    await AsyncStorage.setItem(
      wardrobeKey(userId),
      JSON.stringify(list)
    );
  } catch (err) {
    console.error("saveItemList error:", err);
  }
}

export async function addItem(item: any) {
  const list = await loadItemList();
  list.push(item);
  await saveItemList(list);
}

export async function removeItem(id: string) {
  const list = await loadItemList();
  await saveItemList(list.filter((i) => i.id !== id));
}

export async function editItem(id: string, updates: any) {
  const list = await loadItemList();
  const newList = list.map((i) =>
    i.id === id ? { ...i, ...updates } : i
  );
  await saveItemList(newList);
}

/* ---------------------------------------------------
 * LOOKS (Calendar)
 * --------------------------------------------------- */

export async function loadLooks() {
  try {
    const userId = requireUserId();
    const raw = await AsyncStorage.getItem(looksKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("loadLooks error:", err);
    return {};
  }
}

export async function loadSingleLook(date: string, lookId: string) {
  try {
    const looks = await loadLooks();
    const list = looks[date] || [];
    return list.find((l: any) => l.id === lookId) || null;
  } catch (err) {
    console.error("loadSingleLook error:", err);
    return null;
  }
}

export async function saveLook(date: string, look: any) {
  try {
    const userId = requireUserId();
    const looks = await loadLooks();

    if (!looks[date]) looks[date] = [];

    const list = looks[date];

    // 🔥 หา index ก่อน
    const index = list.findIndex((l: any) => l.id === look.id);

    if (index !== -1) {
      // ✅ UPDATE (มี id เดิม)
      list[index] = {
        ...list[index],
        items: Array.isArray(look.items) ? look.items : list[index].items,
        imageUri: look.imageUri || list[index].imageUri,
        layout: look.layout || list[index].layout,
      };
    } else {
      // ✅ CREATE (ไม่มี id หรือหาไม่เจอ)
      list.push({
        id: look.id || Date.now().toString(),
        items: look.items ?? [],
        imageUri: look.imageUri ?? null,
        layout: look.layout ?? [],
      });
    }

    looks[date] = list;

    await AsyncStorage.setItem(
      looksKey(userId),
      JSON.stringify(looks)
    );
  } catch (err) {
    console.error("saveLook error:", err);
  }
}

/* ---------------------------------------------------
 * REMOVE LOOK(S)
 * --------------------------------------------------- */

export async function removeLook(date: string) {
  try {
    const userId = requireUserId();
    const looks = await loadLooks();
    delete looks[date];
    await AsyncStorage.setItem(
      looksKey(userId),
      JSON.stringify(looks)
    );
  } catch (err) {
    console.error("removeLook error:", err);
  }
}

export async function removeSingleLook(date: string, lookId: string) {
  try {
    const userId = requireUserId();
    const looks = await loadLooks();
    looks[date] = (looks[date] || []).filter(
      (l: any) => l.id !== lookId
    );

    await AsyncStorage.setItem(
      looksKey(userId),
      JSON.stringify(looks)
    );
  } catch (err) {
    console.error("removeSingleLook error:", err);
  }
}
