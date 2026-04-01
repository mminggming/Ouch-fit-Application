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
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3;

/* ===================== TYPES ===================== */

type WardrobeItem = {
  id: string;
  name?: string;
  brand?: string;
  category?: string;
  imageUri?: string;
};

/* ===================== SCREEN ===================== */

export default function PackingDetail() {
  const { packingId } = useLocalSearchParams<{ packingId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);

  const [editMode, setEditMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [activeCat, setActiveCat] = useState("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [titleDraft, setTitleDraft] = useState("");
const [initialItems, setInitialItems] = useState<WardrobeItem[]>([]);

  /* ===================== LOAD ===================== */

  const loadData = useCallback(async () => {
    if (!packingId) return;

    const saved = await AsyncStorage.getItem(`packing_${packingId}`);
    const all = await AsyncStorage.getItem("wardrobeItems");

    setItems(saved ? JSON.parse(saved) : []);
setInitialItems(saved ? JSON.parse(saved) : []);
setTitleDraft(packingId); // ใช้ชื่อ list เป็น draft

    setWardrobe(all ? JSON.parse(all) : []);
  }, [packingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ===================== SAVE ===================== */

  async function handleSave() {
  const newKey = `packing_${titleDraft.trim() || packingId}`;

  // ถ้าเปลี่ยนชื่อ → ลบ key เก่า
  if (newKey !== `packing_${packingId}`) {
    await AsyncStorage.removeItem(`packing_${packingId}`);
  }

  await AsyncStorage.setItem(newKey, JSON.stringify(items));
  
  Alert.alert("Saved", "Packing list updated");
}


  /* ===================== REMOVE ===================== */

  function removeItem(id: string) {
    setItems((p) => p.filter((i) => i.id !== id));
  }

  /* ===================== ADD ===================== */

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function confirmAdd() {
    const addItems = wardrobe.filter(
      (w) => selected.has(w.id) && !items.some((i) => i.id === w.id)
    );
    setItems((p) => [...p, ...addItems]);
    setSelected(new Set());
    setModalVisible(false);
  }

  /* ===================== FILTER ===================== */

  const categories = [
    "All",
    ...Array.from(
      new Set(
        wardrobe
          .map((i) => i.category)
          .filter((c): c is string => !!c)
      )
    ),
  ];

  const available = wardrobe.filter(
    (w) => !items.some((i) => i.id === w.id)
  );

  const filtered =
    activeCat === "All"
      ? available
      : available.filter((w) => w.category === activeCat);

  /* ===================== RENDER ===================== */

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
  <Pressable
    onPress={() => {
      if (!editMode) {
        router.back();
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
              setItems(initialItems);
              setTitleDraft(packingId);
              setSelected(new Set());      
              setActiveCat("All");  
              setEditMode(false);
              router.back();
            },
          },
          { text: "Cancel", style: "cancel" },
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
      autoFocus
      selectTextOnFocus
    />
  ) : (
    <Text style={styles.title}>{packingId}</Text>
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
      const newName = titleDraft.trim() || packingId;
      await handleSave();
      setEditMode(false);

      // ✅ ถ้าเปลี่ยนชื่อ → replace route
      if (newName !== packingId) {
        router.replace(`/packing/${newName}`);
      }
    }}
  >
    <Ionicons name="save-outline" size={24} color="#C00000" />
  </Pressable>
)}

  </View>
</View>


      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>In this packing list</Text>

        <View style={styles.grid}>
          {items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.imgWrap}>
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.img}
                  resizeMode="contain"
                  fadeDuration={0}
                />
              </View>

              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.brand}>{item.brand}</Text>

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

        {editMode && (
  <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
    <Ionicons name="add" size={18} color="#fff" />
    <Text style={styles.addTxt}>Add items</Text>
  </Pressable>
)}

      </ScrollView>

      {/* ================= MODAL ================= */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { paddingTop: insets.top + 12 },
            ]}
          >
            <View style={styles.handle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add items</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#000" />
              </Pressable>
            </View>

            {/* FILTER */}
            <View style={styles.filterWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContent}
              >
                {categories.map((cat) => (
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
            </View>

            {/* GRID */}
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.grid}>
                {filtered.map((item) => {
                  const checked = selected.has(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.card,
                        checked && styles.cardSelected,
                      ]}
                      onPress={() => toggle(item.id)}
                    >
                      <View style={styles.imgWrap}>
                        <Image
                          source={{ uri: item.imageUri }}
                          style={styles.img}
                          resizeMode="contain"
                          fadeDuration={0}
                        />
                      </View>

                      <Text style={styles.name} numberOfLines={1}>
                        {item.name}
                      </Text>

                      {checked && (
                        <View style={styles.checkBadge}>
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color="#fff"
                          />
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

/* ===================== STYLES ===================== */

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

  section: {
    fontFamily: "ProductSans-Bold",
    fontSize: 16,
    marginVertical: 12,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 8,
    marginBottom: 12,
  },

  cardSelected: {
    borderWidth: 2,
    borderColor: "#C00000",
  },

  imgWrap: {
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
  },

  img: {
    width: "100%",
    height: CARD_WIDTH,
    backgroundColor: "#fff",
  },

  name: {
    fontFamily: "ProductSans-Bold",
    fontSize: 12,
    marginTop: 4,
  },

  brand: {
    fontFamily: "ProductSans",
    fontSize: 10,
    color: "#666",
  },

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
    paddingHorizontal: 16,
    paddingBottom: 16,
    maxHeight: "92%",
  },

  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    marginBottom: 10,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  modalTitle: {
    fontFamily: "ProductSans-Bold",
    fontSize: 18,
  },

  filterWrapper: { marginBottom: 8 },

  filterContent: { paddingVertical: 4 },

  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 8,
    backgroundColor: "#fff",
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

