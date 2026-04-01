// api/config.ts
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";

const PORT = 5119;
const STORE_KEY = "api:lastKnownBase";

const ENV_OVERRIDE: string | undefined =
  (Constants.expoConfig?.extra as any)?.API_BASE ||
  (process.env.EXPO_PUBLIC_API_BASE as string | undefined);

// ดึง host ของ Metro (มักจะเป็น IP เครื่องแมคใน LAN)
function getDevHostFromExpo(): string | null {
  const dbg = (Constants as any)?.manifest?.debuggerHost as string | undefined; // legacy
  const hostUri = Constants.expoConfig?.hostUri; // modern
  const src = dbg || hostUri || "";
  if (!src.includes(":")) return null;
  const host = src.split(":")[0];
  // เผื่อเป็น "192.168.1.105" หรือ "172.20.10.13"
  return host || null;
}

// สร้าง candidate ตามแพลตฟอร์ม/สภาพแวดล้อม
function buildCandidates(): string[] {
  const cands: string[] = [];

  // 0) ถ้ามี ENV override (เช่น ngrok) ให้ลองก่อนสุด
  if (ENV_OVERRIDE) {
    cands.push(ENV_OVERRIDE.endsWith("/api") ? ENV_OVERRIDE : `${ENV_OVERRIDE.replace(/\/+$/, "")}/api`);
  }

  if (Platform.OS === "android") {
    // Android Emulator → localhost ของ host คือ 10.0.2.2
    cands.push(`http://10.0.2.2:${PORT}/api`);
  }

  // iOS Simulator (รันอยู่บน Mac) → เข้าถึง host ผ่าน localhost ได้
  const isIosSim = Platform.OS === "ios" && !Device.isDevice;
  if (isIosSim) cands.push(`http://localhost:${PORT}/api`);

  // IP จาก Expo Dev Server (มักจะเป็น IP เครื่องแมคในเครือข่ายปัจจุบัน)
  const host = getDevHostFromExpo();
  if (host) cands.push(`http://${host}:${PORT}/api`);

  return Array.from(new Set(cands)); // unique
}

// ping /mixmatch/ping เพื่อตรวจว่าติดจริง
async function ping(base: string, timeoutMs = 5000): Promise<boolean> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/mixmatch/ping`, { signal: controller.signal });
    clearTimeout(id);
    return res.ok;
  } catch {
    clearTimeout(id);
    return false;
  }
}

let memoBase: string | null = null;

/** เรียกใช้ตัวนี้เพื่อให้ได้ BASE_URL ที่ “ใช้ได้จริง” (มี ping) พร้อม cache */
export async function getBaseApiUrl(): Promise<string> {
  if (memoBase) return memoBase;

  // 1) ลองใช้ cached ก่อน
  const cached = await AsyncStorage.getItem(STORE_KEY);
  if (cached && (await ping(cached))) {
    memoBase = cached;
    return memoBase;
  }

  // 2) ลอง candidate ตามสภาพแวดล้อม
  const candidates = buildCandidates();

  for (const cand of candidates) {
    if (await ping(cand)) {
      memoBase = cand;
      await AsyncStorage.setItem(STORE_KEY, memoBase);
      return memoBase;
    }
  }

  // 3) ถ้าไม่เจอ อนุโลมคืนอันแรก (ไว้ให้แอปแสดง error ต่อ)
  memoBase = candidates[0] || `http://localhost:${PORT}/api`;
  return memoBase;
}

/** สำหรับกรณีอยากแสดง/Log ค่าเดานาทีแรกแบบ sync (ยังไม่การันตี ping) */
export const BASE_API_URL_GUESS: string = (() => {
  const fromEnv = ENV_OVERRIDE ? (ENV_OVERRIDE.endsWith("/api") ? ENV_OVERRIDE : `${ENV_OVERRIDE.replace(/\/+$/, "")}/api`) : "";
  if (fromEnv) return fromEnv;
  if (Platform.OS === "android") return `http://10.0.2.2:${PORT}/api`;
  const isIosSim = Platform.OS === "ios" && !Device.isDevice;
  if (isIosSim) return `http://localhost:${PORT}/api`;
  const host = getDevHostFromExpo();
  if (host) return `http://${host}:${PORT}/api`;
  return `http://localhost:${PORT}/api`;
})();
