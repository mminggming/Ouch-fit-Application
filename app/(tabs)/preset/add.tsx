import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const AI_PRESET_KEY = "ai_presets";

export default function AddPreset() {
  const router = useRouter();
  const [name, setName] = useState("");

  async function createPreset() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Please enter a name");
      return;
    }

    const raw = await AsyncStorage.getItem(AI_PRESET_KEY);
    const presets = raw ? JSON.parse(raw) : [];

    const exists = presets.some(
      (p: any) => p.title.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      Alert.alert("Duplicate", "This preset already exists.");
      return;
    }

    const newPreset = {
      id: Date.now().toString(),
      title: trimmed,
      outfit: [],
      createdAt: Date.now(),
    };

    await AsyncStorage.setItem(
      AI_PRESET_KEY,
      JSON.stringify([newPreset, ...presets])
    );

    setName("");
    Alert.alert("Created!", `${trimmed} preset created.`);
    router.push("/(tabs)/preset"); // 🔁 กลับหน้า list
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 20 }}>
        <Ionicons name="arrow-back" size={22} color="#C00000" />
      </Pressable>

      <Text style={styles.title}>New preset</Text>

      <TextInput
        placeholder="Name your preset..."
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <Pressable style={styles.btn} onPress={createPreset}>
        <Text style={styles.btnText}>Create preset</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA", padding: 20 },
  title: {
    fontFamily: "ProductSans-Bold",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 30,
    color: "#000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    padding: 14,
    fontFamily: "ProductSans",
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  btn: {
    backgroundColor: "#C00000",
    paddingVertical: 14,
    borderRadius: 12,
    alignSelf: "center",
    width: 220,
  },
  btnText: {
    color: "#fff",
    fontFamily: "ProductSans-Bold",
    textAlign: "center",
    fontSize: 15,
  },
});
