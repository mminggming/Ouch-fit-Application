// --- FILE: api/wardrobe.ts ---
// ✔ ใช้ร่วมกับ Expo / React Native / Expo Go ได้
// ✔ ไม่ต้องแก้ IP เองทุกครั้ง
// ✔ auto-detect base url ผ่าน config.ts
// ✔ แก้ปัญหา imageUrl เป็น relative path (/images/xxx.png)
// ✔ รองรับ remove background ผ่าน .NET backend
// ✔ debug ชัดเจน

import { getBaseApiUrl } from "./config";

// ============================================================================
// helper: resolve base api url แล้วค่อยยิง request
// ============================================================================
async function withBase<T>(fn: (base: string, origin: string) => Promise<T>) {
  const base = await getBaseApiUrl(); // เช่น http://localhost:5119/api
  const origin = base.replace(/\/api\/?$/, ""); // 👉 http://localhost:5119
  return fn(base, origin);
}

// ============================================================================
// GET ITEMS
// ============================================================================
export async function getWardrobeItems() {
  return withBase(async (base) => {
    const url = `${base}/wardrobe`;
    const res = await fetch(url);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Fetch failed (${res.status}): ${err}`);
    }

    return res.json();
  });
}

// ============================================================================
// ADD ITEM
// ============================================================================
export async function uploadWardrobeItem(item: any) {
  return withBase(async (base) => {
    const url = `${base}/wardrobe`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Upload failed (${res.status}): ${err}`);
    }

    return res.json();
  });
}

// ============================================================================
// DELETE ITEM
// ============================================================================
export async function deleteWardrobeItem(id: string) {
  return withBase(async (base) => {
    const url = `${base}/wardrobe/${id}`;
    const res = await fetch(url, { method: "DELETE" });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Delete failed (${res.status}): ${err}`);
    }

    return res.json();
  });
}

// ============================================================================
// 🧠 REMOVE BACKGROUND
// - backend ส่งกลับมาเป็น relative path เช่น /images/xxx.png
// - FIX: แปลงเป็น absolute URL ให้ React Native โหลดได้
// ============================================================================
export async function removeBackground(imageUri: string) {
  return withBase(async (base, origin) => {
    console.log("🟡 removeBackground(imageUri):", imageUri);

    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      name: "upload.jpg",
      type: "image/jpeg",
    } as any);

    const url = `${base}/wardrobe/remove-bg`;
    const res = await fetch(url, {
      method: "POST",
      body: formData,
      // ❗️อย่าตั้ง Content-Type เอง
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ removeBackground backend error:", err);
      throw new Error(`Remove BG failed (${res.status}): ${err}`);
    }

    const json = await res.json();

    /**
     * backend ส่งมา:
     * { imageUrl: "/images/xxxx.png" }
     *
     * ต้องแปลงเป็น:
     * http://<host>:5119/images/xxxx.png
     */
    if (json.imageUrl && json.imageUrl.startsWith("/")) {
      json.imageUrl = `${origin}${json.imageUrl}`;
    }

    console.log("✅ removeBackground success:", json);
    return json;
  });
}
