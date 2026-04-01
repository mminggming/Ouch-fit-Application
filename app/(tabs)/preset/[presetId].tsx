// app/(tabs)/preset/[presetId].tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3;
const AI_PRESET_KEY = "ai_presets";


type WardrobeItem = {
  id: string;
  name?: string;
  imageUri?: string;
  category?: string;
};

type AiPreset = {
  id: string;
  title: string;
  outfit: string[];
};

export default function PresetDetail() {
  const { presetId } = useLocalSearchParams<{ presetId: string }>();
  const router = useRouter();

  // ✅ STATES (ต้องอยู่ใน component)
  const [preset, setPreset] = useState<AiPreset | null>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [activeCat, setActiveCat] = useState("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialTitle, setInitialTitle] = useState("");
  const [initialOutfit, setInitialOutfit] = useState<string[]>([]);


  /* ================= LOAD ================= */

  const load = useCallback(async () => {
    if (!presetId) return;

    const rawPreset = await AsyncStorage.getItem(AI_PRESET_KEY);
    const rawWardrobe = await AsyncStorage.getItem("wardrobeItems");
    if (!rawPreset) return;

    const presets: AiPreset[] = JSON.parse(rawPreset);
    const found = presets.find(p => p.id === presetId);
    if (!found) return;

    const allWardrobe: WardrobeItem[] = rawWardrobe
      ? JSON.parse(rawWardrobe)
      : [];

    setPreset(found);
    setTitleDraft(found.title);
    setInitialTitle(found.title);
    setInitialOutfit(found.outfit);
    setWardrobe(allWardrobe);
    setItems(allWardrobe.filter(w => found.outfit.includes(w.id)));
  }, [presetId]);

  useEffect(() => {
    load();
  }, [load]);

  const isDirty =
    titleDraft.trim() !== initialTitle ||
    items.map(i => i.id).join(",") !== initialOutfit.join(",");

  /* ================= SAVE ================= */

  async function save() {
    if (!preset) return;

    const newTitle = titleDraft.trim() || preset.title;

    const raw = await AsyncStorage.getItem(AI_PRESET_KEY);
    const presets: AiPreset[] = raw ? JSON.parse(raw) : [];

    const updated = presets.map(p =>
      p.id === preset.id
        ? { ...p, title: newTitle, outfit: items.map(i => i.id) }
        : p
    );

    await AsyncStorage.setItem(AI_PRESET_KEY, JSON.stringify(updated));

    // ✅ สำคัญ: update state ทันที
    setPreset(prev =>
      prev ? { ...prev, title: newTitle } : prev
    );

    Alert.alert("Saved", "Preset updated");
  }


  /* ================= ADD / REMOVE ================= */

  function removeItem(id: string) {
    setItems(p => p.filter(i => i.id !== id));
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function confirmAdd() {
    const addItems = wardrobe.filter(
      w => selected.has(w.id) && !items.some(i => i.id === w.id)
    );

    setItems(p => [...p, ...addItems]);
    setSelected(new Set());
    setModalVisible(false);
  }

  /* ================= FILTER ================= */

  const categories = [
    "All",
    ...Array.from(
      new Set(
        wardrobe
          .map(i => i.category)
          .filter((c): c is string => !!c)
      )
    ),
  ];

  const available = wardrobe.filter(
    w => !items.some(i => i.id === w.id)
  );

  const filtered =
    activeCat === "All"
      ? available
      : available.filter(w => w.category === activeCat);

  if (!preset) return null;

  /* ================= RENDER ================= */

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (!editMode) {
              router.replace("/(tabs)/preset");
              return;
            }

            Alert.alert(
              "Discard changes?",
              "Changes you made will not be saved.",
              [
                {
                  text: "Discard",
                  style: "destructive",
                  onPress: () => {
                    // 🔁 reset draft กลับค่าเดิม
                    setTitleDraft(preset.title);
                    setItems(
                      wardrobe.filter(w => preset.outfit.includes(w.id))
                    );
                    setEditMode(false);
                    router.back();
                  },
                },
                {
                  text: "Cancel",
                  style: "cancel",
                },
              ]
            );
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#C00000" />
        </Pressable>

        {editMode ? (
          <TextInput
            value={titleDraft}
            onChangeText={setTitleDraft}
            style={styles.titleInput}
            placeholder="Preset name"
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <Text style={styles.title}>{preset.title}</Text>
        )}

        <View style={{ flexDirection: "row", gap: 14 }}>
          {!editMode && (
            <Pressable onPress={() => setEditMode(true)}>
              <Text style={styles.editTxt}>Edit</Text>
            </Pressable>
          )}


          {editMode && (
            <Pressable
              onPress={async () => {
                await save();
                setEditMode(false);
              }}
            >
              <Ionicons name="save-outline" size={24} color="#C00000" />
            </Pressable>
          )}

        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {items.map(item => (
            <View key={item.id} style={styles.card}>
              <Image source={{ uri: item.imageUri }} style={styles.img} />
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>

              {editMode && (
                <Pressable
                  style={styles.trash}
                  onPress={() => removeItem(item.id)}
                >
                  <Ionicons name="trash" size={14} color="#fff" />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {/* ➕ ADD ITEMS */}
        {editMode && (
          <Pressable
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addTxt}>Add items</Text>
          </Pressable>
        )}

      </ScrollView>

      {/* ================= MODAL ================= */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add items</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map(cat => (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCat(cat)}
                  style={[
                    styles.filterChip,
                    activeCat === cat && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      activeCat === cat && styles.filterTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView>
              <View style={styles.grid}>
                {filtered.map(item => {
                  const checked = selected.has(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.card, checked && styles.cardSelected]}
                      onPress={() => toggle(item.id)}
                    >
                      <Image source={{ uri: item.imageUri }} style={styles.img} />
                      <Text style={styles.name}>{item.name}</Text>
                      {checked && (
                        <View style={styles.checkBadge}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Pressable style={styles.confirmBtn} onPress={confirmAdd}>
              <Text style={styles.confirmTxt}>Add selected</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA", padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontFamily: "ProductSans-Bold", fontSize: 20 },
  editTxt: { fontFamily: "ProductSans-Bold", color: "#C00000" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 8,
    marginBottom: 12,
    position: "relative",
  },
  cardSelected: { borderWidth: 2, borderColor: "#C00000" },
  img: { width: "100%", height: CARD_WIDTH, borderRadius: 10 },
  name: { fontFamily: "ProductSans-Bold", fontSize: 12, marginTop: 4 },
  trash: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#C00000",
    borderRadius: 12,
    padding: 4,
  },
  addBtn: {
    marginTop: 12,
    backgroundColor: "#C00000",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  addTxt: { color: "#fff", fontFamily: "ProductSans-Bold" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: "90%",
  },
  modalTitle: {
    fontFamily: "ProductSans-Bold",
    fontSize: 18,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  filterText: { fontSize: 12, fontFamily: "ProductSans", color: "#333" },
  filterTextActive: { color: "#fff" },
  checkBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#C00000",
    borderRadius: 10,
    padding: 4,
  },
  confirmBtn: {
    backgroundColor: "#000",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 10,
  },
  confirmTxt: {
    color: "#fff",
    fontFamily: "ProductSans-Bold",
    textAlign: "center",
    fontSize: 15,
  },
  titleInput: {
    fontFamily: "ProductSans-Bold",
    fontSize: 20,
    color: "#000",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 2,
    borderBottomColor: "#C00000",

  },

});
