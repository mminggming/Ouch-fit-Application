import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function PackingIndex() {
  const router = useRouter();
  const [packings, setPackings] = useState<Record<string, string[]>>({});

  useFocusEffect(
    useCallback(() => {
      loadPackings();
    }, [])
  );

  async function loadPackings() {
    const keys = await AsyncStorage.getAllKeys();
    const packingKeys = keys.filter((k) => k.startsWith("packing_"));
    const all: Record<string, string[]> = {};

    for (const key of packingKeys) {
      const data = await AsyncStorage.getItem(key);
      const parsed = data ? JSON.parse(data) : [];
      // ⬅️ ใช้สูงสุด 5 รูป
      const previewImgs = parsed.slice(0, 5).map((i: any) => i.imageUri);
      all[key.replace("packing_", "")] = previewImgs;
    }
    setPackings(all);
  }

  async function deleteList(name: string) {
    Alert.alert("Delete list", `Delete "${name}" ?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(`packing_${name}`);
          loadPackings();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#C00000" />
        </Pressable>
        <Text style={styles.title}>Packing list Album</Text>
        <Pressable onPress={() => router.push("/(tabs)/packing/add")}>
          <Ionicons name="add" size={22} color="#C00000" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {Object.keys(packings).length === 0 ? (
          <Text style={styles.emptyText}>No packing list yet</Text>
        ) : (
          <View style={styles.grid}>
            {Object.entries(packings).map(([key, imgs]) => (
              <Pressable
                key={key}
                style={styles.packCard}
                onPress={() => router.push(`/packing/${key}`)}
              >
                <Text style={styles.packTitle}>{key}</Text>

                {/* 🔥 Preview Layout ใหม่ */}
                <View style={styles.previewContainer}>
                  {/* รูปใหญ่ */}
                  {imgs[0] && (
                    <Image
                      source={{ uri: imgs[0] }}
                      style={styles.previewBig}
                    />
                  )}

                  {/* รูปเล็ก 4 รูป */}
                  <View style={styles.previewRight}>
                    {[1, 2, 3, 4].map(
                      (i) =>
                        imgs[i] && (
                          <Image
                            key={i}
                            source={{ uri: imgs[i] }}
                            style={styles.previewSmall}
                          />
                        )
                    )}
                  </View>
                </View>

                {/* ปุ่มลบ */}
                <Pressable
                  onPress={() => deleteList(key)}
                  style={styles.trashBtn}
                >
                  <Ionicons name="trash" size={16} color="#fff" />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA", padding: 20 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  title: {
    fontFamily: "ProductSans-Bold",
    fontSize: 20,
    color: "#000",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#777",
    fontFamily: "ProductSans",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  packCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    position: "relative",
    elevation: 3,
  },

  packTitle: {
    fontFamily: "ProductSans-Bold",
    fontSize: 15,
    color: "#000",
  },

  previewContainer: {
    flexDirection: "row",
    marginTop: 10,
    gap: 6,
  },

  previewBig: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#eee",
  },

  previewRight: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 72,
    justifyContent: "space-between",
  },

  previewSmall: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#eee",
    marginBottom: 4,
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
