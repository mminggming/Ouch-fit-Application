import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FS from "expo-file-system/legacy";
import { getBaseApiUrl } from "../../../api/config";

/* ================= TYPES ================= */

type WardrobeItem = {
  id: string;
  name?: string;
  brand?: string;
  imageUri?: string;
};

type ApiOutfit = {
  caption?: string;
  title?: string;
  outfit: string[];
};

type AiPreset = {
  id: string;
  title: string;
  caption?: string;
  outfit: string[];
  createdAt: number;
};

const AI_PRESET_KEY = "ai_presets";

/* ================= UTILS ================= */

async function getWardrobeWithImages(limit = 12) {
  const raw = await AsyncStorage.getItem("wardrobeItems");
  const all: WardrobeItem[] = raw ? JSON.parse(raw) : [];
  const items = all.filter(i => i.imageUri);

  const images = [];
  for (const it of items) {
    try {
      const base64 = await FS.readAsStringAsync(it.imageUri!, {
        encoding: FS.EncodingType.Base64,
      });
      images.push({ id: it.id, mimeType: "image/jpeg", base64 });
    } catch { }
  }

  return {
    wardrobe: all.map(({ imageUri, ...m }) => m), // ส่งทุกตัว
    images, // เอา image แค่บางชิ้น
    allRaw: all,
  };

}

/* ================= SCREEN ================= */

export default function MixMatchScreen() {
  const [theme, setTheme] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApiOutfit[]>([]);
  const [rawWardrobe, setRawWardrobe] = useState<WardrobeItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState<ApiOutfit | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const [packingLists, setPackingLists] = useState<string[]>([]);
  const [selectedPacking, setSelectedPacking] = useState<string | null>(null);
  const [newPacking, setNewPacking] = useState("");
  const [packingOpen, setPackingOpen] = useState(false)

  useEffect(() => {
    if (!active) return;
    (async () => {
      const keys = await AsyncStorage.getAllKeys();
      setPackingLists(
        keys.filter(k => k.startsWith("packing_")).map(k => k.replace("packing_", ""))
      );
    })();
  }, [active]);

  /* ================= HELPERS ================= */

  const getItem = (id: string) =>
    rawWardrobe.find(w => w.id === id);

  const selectedIds = () =>
    Object.keys(checkedItems).filter(id => checkedItems[id]);

  function resetModal() {
    setActive(null);
    setCheckedItems({});
    setSelectedPacking(null);
    setNewPacking("");
    setPackingOpen(false);
  }

  /* ================= ACTIONS ================= */

  async function handleGenerate() {
    if (!theme.trim()) return;
    Keyboard.dismiss();

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const BASE = await getBaseApiUrl();
      const { wardrobe, images, allRaw } = await getWardrobeWithImages();
      setRawWardrobe(allRaw);

      const res = await fetch(`${BASE}/mixmatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, wardrobe, images }),
      });

      const data = JSON.parse(await res.text());
      if (Array.isArray(data)) setResults(data);
      else setError("Unexpected AI response");
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToPacking() {
    const ids = selectedIds();
    if (ids.length === 0) return Alert.alert("No items selected");

    let target = selectedPacking;

    if (newPacking.trim()) {
      target = newPacking.trim();
      await AsyncStorage.setItem(`packing_${target}`, JSON.stringify([]));
    }

    if (!target) return Alert.alert("Select a packing list");

    const key = `packing_${target}`;
    const raw = await AsyncStorage.getItem(key);
    const current = raw ? JSON.parse(raw) : [];

    const toAdd = ids
      .map(id => getItem(id))
      .filter(Boolean)
      .filter(it => !current.find((c: any) => c.id === it!.id));

    await AsyncStorage.setItem(key, JSON.stringify([...current, ...toAdd]));

    Alert.alert("Added", "Items added to packing list");
    setActive(null);
    setSelectedPacking(null);
    setNewPacking("");
  }


  async function handleSavePreset() {
    if (!active) return;

    try {
      const ids = selectedIds();
      if (ids.length === 0) return Alert.alert("No items selected");

      const raw = await AsyncStorage.getItem(AI_PRESET_KEY);
      const current: AiPreset[] = raw ? JSON.parse(raw) : [];

      const preset: AiPreset = {
        id: Date.now().toString(),
        title: active.title || active.caption || "AI Outfit",
        caption: active.caption,
        outfit: ids,
        createdAt: Date.now(),
      };

      await AsyncStorage.setItem(
        AI_PRESET_KEY,
        JSON.stringify([preset, ...current])
      );

      Alert.alert("Saved", "Outfit preset saved to wardrobe");
    } catch {
      Alert.alert("Error", "Failed to save preset");
    }
  }


  /* ================= UI ================= */

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>Mix & Match</Text>
          <Text style={styles.headerSub}>AI outfit stylist</Text>
        </View>
        <View style={styles.sparkle}>
          <Ionicons name="sparkles" size={18} color="#C00000" />
        </View>
      </View>

      {/* INPUT */}
      <View style={styles.inputRow}>
        <Ionicons name="shirt-outline" size={18} color="#999" />
        <TextInput
          value={theme}
          onChangeText={setTheme}
          placeholder="Theme เช่น beach, work, party"
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={handleGenerate}
        />
        <Pressable
          style={[styles.goBtn, !theme.trim() && { opacity: 0.4 }]}
          disabled={!theme.trim()}
          onPress={handleGenerate}
        >
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* CONTENT */}
      {loading ? (
        <ActivityIndicator size="large" color="#C00000" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
          {results.length === 0 ? (
            <Text style={styles.empty}>No results yet — try a theme</Text>
          ) : (
            results.map((r, idx) => (
              <Pressable
                key={idx}
                style={styles.card}
                onPress={() => {
                  const init: any = {};
                  r.outfit.forEach(id => (init[id] = true));
                  setCheckedItems(init);
                  setActive(r);
                }}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {r.title || r.caption || `Look ${idx + 1}`}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {r.outfit.map(id => {
                    const it = getItem(id);
                    return it?.imageUri ? (
                      <Image key={id} source={{ uri: it.imageUri }} style={styles.previewImg} />
                    ) : null;
                  })}
                </ScrollView>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* MODAL */}
      <Modal visible={!!active} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <ScrollView>
              {active?.outfit.map(id => {
                const it = getItem(id);
                if (!it?.imageUri) return null;
                return (
                  <Pressable
                    key={id}
                    style={styles.modalItem}
                    onPress={() =>
                      setCheckedItems({ ...checkedItems, [id]: !checkedItems[id] })
                    }
                  >
                    <Ionicons
                      name={checkedItems[id] ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color="#C00000"
                    />
                    <Image source={{ uri: it.imageUri }} style={styles.modalImg} />
                    <Text style={styles.modalText}>{it.name || "Item"}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {/* EXISTING PACKING LISTS */}
            {packingLists.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ marginBottom: 8, color: "#777" }}>
                  Select packing list
                </Text>

                {packingLists.map(name => {
                  const selected = selectedPacking === name;
                  return (
                    <Pressable
                      key={name}
                      onPress={() => {
                        setSelectedPacking(name);
                        setNewPacking(""); // ถ้าเลือกของเดิม ให้เคลียร์ input ใหม่
                      }}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: selected ? "#C00000" : "#eee",
                        backgroundColor: selected ? "#FFF0F0" : "#fff",
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: selected ? "#C00000" : "#333",
                          fontFamily: selected ? "ProductSans-Bold" : undefined,
                        }}
                      >
                        {name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <View style={{ marginTop: 12 }}>
              <Text style={{ marginBottom: 6, color: "#777" }}>
                Or create new packing list
              </Text>

              <TextInput
                value={newPacking}
                onChangeText={text => {
                  setNewPacking(text);
                  if (text.trim()) setSelectedPacking(null);
                }}
                placeholder="e.g. Japan Trip"
                style={{
                  borderWidth: 1,
                  borderColor: "#eee",
                  borderRadius: 14,
                  padding: 12,
                }}
              />
            </View>

            <Pressable style={styles.primaryBtn} onPress={handleAddToPacking}>
              <Text style={styles.primaryText}>
                Add {selectedIds().length} items to{" "}
                {selectedPacking || newPacking || "packing list"}
              </Text>
            </Pressable>

            <Pressable style={styles.presetBtn} onPress={handleSavePreset}>
              <Ionicons name="bookmark-outline" size={18} color="#C00000" />
              <Text style={styles.presetTxt}>Save preset</Text>
            </Pressable>

            <Pressable onPress={resetModal}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  logo: { fontSize: 26, fontFamily: "ProductSans-Bold" },
  headerSub: { fontSize: 12, color: "#777" },

  sparkle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },

  inputRow: {
    flexDirection: "row",
    backgroundColor: "#F3F3F3",
    borderRadius: 999,
    padding: 12,
    alignItems: "center",
  },
  input: { flex: 1, marginLeft: 8 },
  goBtn: { backgroundColor: "#C00000", borderRadius: 999, padding: 8 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTitle: { fontFamily: "ProductSans-Bold" },

  previewImg: {
    width: 80,
    height: 80,
    borderRadius: 14,
    marginRight: 10,
  },

  empty: { textAlign: "center", color: "#aaa", marginTop: 40 },
  error: { color: "#c00", marginTop: 12 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: "92%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },

  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  modalImg: { width: 54, height: 54, borderRadius: 12 },
  modalText: { flex: 1 },

  primaryBtn: {
    backgroundColor: "#C00000",
    padding: 16,
    borderRadius: 18,
    marginTop: 16,
  },
  primaryText: {
    color: "#fff",
    textAlign: "center",
    fontFamily: "ProductSans-Bold",
  },

  secondaryBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFD6D6",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  secondaryText: { color: "#C00000", fontFamily: "ProductSans-Bold" },

  cancel: { textAlign: "center", marginTop: 12, color: "#777" },
  presetBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFD6D6",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  presetTxt: {
    color: "#C00000",
    fontFamily: "ProductSans-Bold",
  },

});
