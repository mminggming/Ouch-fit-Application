import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AiPreset = {
  id: string;
  title: string;
  outfit: string[];
  createdAt: number;
};

type WardrobeItem = {
  id: string;
  imageUri?: string;
};

const AI_PRESET_KEY = "ai_presets";

/* 🔥 layout constants */
const PREVIEW_SIZE = 72;
const GAP = 6;

export default function PresetIndex() {
  const router = useRouter();

  const [presets, setPresets] = useState<AiPreset[]>([]);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadData();
      setIsEditing(false);
    }, [])
  );

  async function loadData() {
    const rawPreset = await AsyncStorage.getItem(AI_PRESET_KEY);
    const rawWardrobe = await AsyncStorage.getItem("wardrobeItems");

    setPresets(rawPreset ? JSON.parse(rawPreset) : []);
    setWardrobe(rawWardrobe ? JSON.parse(rawWardrobe) : []);
  }

  function getPreview(preset: AiPreset) {
    return preset.outfit
      .map(id => wardrobe.find(w => w.id === id)?.imageUri)
      .filter(Boolean)
      .slice(0, 5) as string[];
  }

  async function deletePreset(id: string) {
    Alert.alert("Delete preset", "Delete this preset?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const next = presets.filter(p => p.id !== id);
          await AsyncStorage.setItem(AI_PRESET_KEY, JSON.stringify(next));
          setPresets(next);
        },
      },
    ]);
  }

  /* 🔥 search filter */
  const filteredPresets = useMemo(() => {
    return presets.filter(p =>
      p.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [presets, search]);

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#C00000" />
        </Pressable>

        <Text style={styles.title}>Preset Album</Text>

        <View style={{ flexDirection: "row", gap: 14 }}>
          <Pressable onPress={() => setIsEditing(!isEditing)}>
            <Ionicons
              name={isEditing ? "close" : "create-outline"}
              size={22}
              color="#C00000"
            />
          </Pressable>

          <Pressable onPress={() => router.push("/(tabs)/preset/add")}>
            <Ionicons name="add" size={22} color="#C00000" />
          </Pressable>
        </View>
      </View>

      {/* 🔍 SEARCH */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#999" />
        <TextInput
          placeholder="Search preset..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredPresets.length === 0 ? (
          <Text style={styles.emptyText}>No preset found</Text>
        ) : (
          <View style={styles.grid}>
            {filteredPresets.map((preset) => {
              const imgs = getPreview(preset);

              return (
                <Pressable
                  key={preset.id}
                  style={[
                    styles.packCard,
                    isEditing && { transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => {
                    if (!isEditing) {
                      router.push(`/preset/${preset.id}`);
                    }
                  }}
                >
                  <Text style={styles.packTitle} numberOfLines={2}>
                    {preset.title}
                  </Text>

                  {/* PREVIEW */}
                  <View style={styles.previewContainer}>
                    {imgs.length > 0 ? (
                      <>
                        {/* BIG */}
                        <Image
                          source={{ uri: imgs[0] }}
                          style={styles.previewBig}
                        />

                        {/* GRID */}
                        <View style={styles.previewGrid}>
                          {[1, 2, 3, 4].map((i) => (
                            <View key={i} style={styles.previewCell}>
                              {imgs[i] && (
                                <Image
                                  source={{ uri: imgs[i] }}
                                  style={styles.previewSmall}
                                />
                              )}
                            </View>
                          ))}
                        </View>
                      </>
                    ) : (
                      <Text style={styles.emptyPreview}>No items</Text>
                    )}
                  </View>

                  {/* DELETE */}
                  {isEditing && (
                    <Pressable
                      onPress={() => deletePreset(preset.id)}
                      style={styles.trashBtn}
                    >
                      <Ionicons name="trash" size={16} color="#fff" />
                    </Pressable>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= STYLE ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA", padding: 20 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  title: {
    fontFamily: "ProductSans-Bold",
    fontSize: 20,
  },

  /* 🔍 SEARCH */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
    gap: 6,
  },

  searchInput: {
    flex: 1,
    fontFamily: "ProductSans",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#777",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  /* 🔥 CARD */
  packCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,

    // 🔥 shadow
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  packTitle: {
    fontFamily: "ProductSans-Bold",
    fontSize: 15,
  },

  previewContainer: {
    flexDirection: "row",
    marginTop: 10,
    gap: GAP,
  },

  /* 🔥 BIG = 1:1 */
  previewBig: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: 14,
    backgroundColor: "#eee",
  },

  previewGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    height: PREVIEW_SIZE,
    rowGap: GAP,
  },

  previewCell: {
    width: "48%",
    height: (PREVIEW_SIZE - GAP) / 2,
  },

  /* 🔥 SMALL = 1:1 */
  previewSmall: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#eee",
  },

  emptyPreview: {
    fontSize: 12,
    color: "#aaa",
  },

  trashBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#C00000",
    borderRadius: 14,
    padding: 4,
  },
});