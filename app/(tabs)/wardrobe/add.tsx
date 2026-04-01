// --- FILE: app/(tabs)/wardrobe/add.tsx ---
// Fully fixed version with:
// - Voice Input Toggle Button
// - Edit Mode + Confirm + Merge Update
// - Custom Dropdown Lists (Persistent)
// - Brand Suggest (non-destructive)
// - Remove Background with Preview Modal (Confirm / Cancel)
// - No conditional hooks
// - Form resets correctly when adding new item
// - No ESLint Hook errors
// - Compatible with Expo Router

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";

import * as FS from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import DropDownPicker from "react-native-dropdown-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useFonts } from "expo-font";
import { useRouter, useLocalSearchParams } from "expo-router";

import {
  addItem,
  getItemById,
  updateItem,
  WardrobeItem,
  loadWardrobe,
} from "../../../lib/wardrobe";

import { removeBackground } from "../../../api/wardrobe";

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================
const DEFAULT_COLORS = ["White", "Black", "Blue", "Red", "Green"];
const DEFAULT_FABRICS = ["Wool", "Cotton", "Silk", "Polyester"];
const DEFAULT_CATS = ["Pants", "Shirt", "Skirt", "Shoes", "Hat"];
const DEFAULT_SEASONS = ["All", "Summer", "Winter", "Spring", "Rainy"];
const DEFAULT_PLACES = ["Home", "Condo", "Office"];

// ============================================================================
// STORAGE KEYS
// ============================================================================
const STORAGE_KEYS = {
  colors: "custom_colors",
  fabrics: "custom_fabrics",
  categories: "custom_categories",
  seasons: "custom_seasons",
  places: "custom_places",
};

// ============================================================================
// LOAD + SAVE CUSTOM OPTIONS
// ============================================================================
async function loadCustomList(key: string, defaults: string[]) {
  const saved = await AsyncStorage.getItem(key);
  if (!saved) return defaults;
  try {
    const arr = JSON.parse(saved);
    return Array.isArray(arr) ? [...defaults, ...arr] : defaults;
  } catch {
    return defaults;
  }
}

async function saveCustomValue(key: string, value: string, defaults: string[]) {
  const saved = await AsyncStorage.getItem(key);
  let arr: string[] = [];
  try {
    arr = saved ? JSON.parse(saved) : [];
  } catch { }
  if (!arr.includes(value)) {
    arr.push(value);
    await AsyncStorage.setItem(key, JSON.stringify(arr));
  }
  return [...defaults, ...arr];
}

// ============================================================================
// ROW INPUT
// ============================================================================
function RowInput({ label, value, onChangeText, placeholder }: any) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={[styles.input, { flex: 1 }]}
      />
    </View>
  );
}

// ============================================================================
// DROPDOWN WITH ADD BUTTON
// ============================================================================
function RowDropdown({
  label,
  open,
  setOpen,
  value,
  setValue,
  items,
  setItems,
  defaults,
  storageKey,
  zIndex,
  zIndexInverse,
}: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [custom, setCustom] = useState("");

  async function handleAdd() {
    const v = custom.trim();
    if (!v) return;
    const updated = await saveCustomValue(storageKey, v, defaults);
    setItems(updated);
    setValue(v);
    setCustom("");
    setShowAdd(false);
  }

  return (
    <View style={{ marginBottom: 12, zIndex }}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <View style={{ flex: 1 }}>
          <DropDownPicker
            open={open}
            setOpen={setOpen}
            value={value}
            setValue={setValue}
            items={items.map((x: string) => ({ label: x, value: x }))}
            style={styles.dropdown}
            dropDownContainerStyle={{ borderColor: "#ccc" }}
            zIndex={zIndex}
            zIndexInverse={zIndexInverse}
          />
        </View>
        <Pressable onPress={() => setShowAdd(!showAdd)} style={styles.addBtn}>
          <Text style={{ fontFamily: "ProductSans-Bold" }}>+ Add</Text>
        </Pressable>
      </View>

      {showAdd && (
        <View style={[styles.row, { marginTop: 8 }]}>
          <TextInput
            value={custom}
            onChangeText={setCustom}
            placeholder={`Add ${label}`}
            style={[styles.input, { flex: 1 }]}
          />
          <Pressable onPress={handleAdd} style={styles.saveSmallBtn}>
            <Text>Save</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ================= FUZZY SEARCH =================
function fuzzyScore(text: string, query: string) {
  text = text.toLowerCase();
  query = query.toLowerCase();

  let tIndex = 0;
  let score = 0;

  for (let i = 0; i < query.length; i++) {
    const found = text.indexOf(query[i], tIndex);
    if (found === -1) return -1;

    score += found === tIndex ? 3 : 1;
    tIndex = found + 1;
  }

  return score;
}

// ============================================================================
// MAIN SCREEN
// ============================================================================
export default function WardrobeAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [fontsLoaded] = useFonts({
    ProductSans: require("../../../assets/fonts/ProductSans-Regular.ttf"),
    "ProductSans-Bold": require("../../../assets/fonts/ProductSans-Bold.ttf"),
  });

  // ---------------- FORM STATE ----------------
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");

  const [color, setColor] = useState("");
  const [fabric, setFabric] = useState("");
  const [category, setCategory] = useState("");
  const [season, setSeason] = useState("");
  const [location, setLocation] = useState("");
  // preview รูปใหญ่ (ดูอย่างเดียว)
const [previewVisible, setPreviewVisible] = useState(false);


  // ---------------- REMOVE BG STATE ----------------
  const [showBgModal, setShowBgModal] = useState(false);
  const [bgPreviewUri, setBgPreviewUri] = useState<string | null>(null);
  const [bgLoading, setBgLoading] = useState(false);

  // ---------------- BRAND SUGGEST ----------------
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [brandSuggest, setBrandSuggest] = useState<string[]>([]);
  const [showBrandSuggest, setShowBrandSuggest] = useState(false);

  // ---------------- OPTIONS ----------------
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [fabrics, setFabrics] = useState(DEFAULT_FABRICS);
  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [seasons, setSeasons] = useState(DEFAULT_SEASONS);
  const [places, setPlaces] = useState(DEFAULT_PLACES);

  // ---------------- DROPDOWN STATES ----------------
  const [colorOpen, setColorOpen] = useState(false);
  const [fabricOpen, setFabricOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  // ---------------- DATE ----------------
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);

  // ---------------- VOICE INPUT ----------------
  const [recognizedText, setRecognizedText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const audioRecordingRef = useRef(new Audio.Recording());

  // ========================================================================
  // RESET FORM
  // ========================================================================
  const resetForm = useCallback(() => {
    setImageUri(null);
    setName("");
    setBrand("");
    setSize("");
    setPrice("");
    setColor("");
    setFabric("");
    setCategory("");
    setSeason("");
    setLocation("");
    setRecognizedText("");
    setDate(new Date());
    setBgPreviewUri(null);
  }, []);

  // ========================================================================
  // LOAD DROPDOWNS
  // ========================================================================
  useEffect(() => {
    (async () => {
      setColors(await loadCustomList(STORAGE_KEYS.colors, DEFAULT_COLORS));
      setFabrics(await loadCustomList(STORAGE_KEYS.fabrics, DEFAULT_FABRICS));
      setCategories(await loadCustomList(STORAGE_KEYS.categories, DEFAULT_CATS));
      setSeasons(await loadCustomList(STORAGE_KEYS.seasons, DEFAULT_SEASONS));
      setPlaces(await loadCustomList(STORAGE_KEYS.places, DEFAULT_PLACES));
    })();
  }, []);

  // ========================================================================
  // LOAD ITEM (EDIT)
  // ========================================================================
  useEffect(() => {
    if (!id) {
      resetForm();
      return;
    }
    (async () => {
      const item = await getItemById(id);
      if (!item) return;
      setName(item.name);
      setBrand(item.brand);
      setSize(item.size ?? "");
      setPrice(item.price ? String(item.price) : "");
      setColor(item.color ?? "");
      setFabric(item.fabric ?? "");
      setCategory(item.category ?? "");
      setSeason(item.season ?? "");
      setLocation(item.location?.[0] ?? "");
      setImageUri(item.imageUri);
      setDate(item.datePurchased ? new Date(item.datePurchased) : new Date());
    })();
  }, [id, resetForm]);

  // ========================================================================
  // LOAD BRAND LIST
  // ========================================================================
  useEffect(() => {
    (async () => {
      const items = await loadWardrobe();
      const brands = Array.from(
        new Set(items.map((i) => i.brand).filter(Boolean))
      );
      setAllBrands(brands);
    })();
  }, []);

  useEffect(() => {
    if (!brand.trim()) {
      setBrandSuggest([]);
      return;
    }
    const result = allBrands
      .map((b) => ({
        name: b,
        score: fuzzyScore(b, brand),
      }))
      .filter(
        (x) =>
          x.score >= 0 &&
          x.name.toLowerCase() !== brand.toLowerCase()
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.name);

    setBrandSuggest(result);
  }, [brand, allBrands]);


  if (!fontsLoaded) return null;

  // ========================================================================
  // REFRESH BRAND LIST (ใช้หลัง add/edit)
  // ========================================================================
  async function refreshBrands() {
    const items = await loadWardrobe();
    const brands = Array.from(
      new Set(items.map((i) => i.brand).filter(Boolean))
    );
    setAllBrands(brands);
  }
  // ========================================================================
  // PICK IMAGE
  // ========================================================================
  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    const dest = `${FS.documentDirectory}wardrobe_${Date.now()}.jpg`;
    await FS.copyAsync({ from: asset.uri, to: dest });
    setImageUri(dest);
    setBgPreviewUri(null);
  }

  // ========================================================================
  // REMOVE BACKGROUND
  // ========================================================================
  async function handleRemoveBg() {
    if (!imageUri) return;
    try {
      setBgLoading(true);
      const res = await removeBackground(imageUri);
      if (res?.imageUrl) setBgPreviewUri(res.imageUrl);
    } catch (err: any) {
  console.error("❌ removeBackground error:", err);
  Alert.alert(
    "Remove background failed",
    err?.message ?? "Unknown error"
  );
}
 finally {
      setBgLoading(false);
    }
  }

  // ========================================================================
  // VOICE INPUT
  // ========================================================================
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        return Alert.alert("ต้องอนุญาตไมค์ก่อน");
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      audioRecordingRef.current = recording;
      await recording.prepareToRecordAsync({
        android: {
          extension: ".wav",
          outputFormat: 1,
          audioEncoder: 1,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
        },
        ios: {
          extension: ".wav",
          audioQuality: 128,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
        },
        web: {
          mimeType: "audio/webm",
          bitsPerSecond: 256000,
        },
      
      });
      await recording.startAsync();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await audioRecordingRef.current.stopAndUnloadAsync();
    } catch (err) {
      console.error(err);
    }
  };

  // ========================================================================
  // SAVE ITEM
  // ========================================================================
  async function onSave() {
    if (!name.trim()) return Alert.alert("กรุณากรอกชื่อ");
    if (!imageUri) return Alert.alert("กรุณาเลือกรูป");

    const item: WardrobeItem = {
      id: id ?? Date.now().toString(),
      name,
      brand,
      size,
      price: Number(price),
      color,
      fabric,
      category,
      season,
      location: [location],
      imageUri: bgPreviewUri ?? imageUri,
      datePurchased: date.toISOString(),
      tags: [],
    };

    if (id) {
      return Alert.alert("ยืนยันการแก้ไข", "ต้องการอัปเดตข้อมูลนี้ใช่ไหม?", [
        { text: "Cancel" },
        {
          text: "OK",
          style: "destructive",
          onPress: async () => {
            await updateItem(item);
            Alert.alert("สำเร็จ", "อัปเดตเรียบร้อยแล้ว");
            router.push("/wardrobe/list");
          },
        },
      ]);
    }

    await addItem(item);
    await refreshBrands(); 
    Alert.alert("Success", "Closet Already Added");
    resetForm();
    router.push("/wardrobe/list");
  }
  

  // ========================================================================
  // UI
  // ========================================================================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <Pressable
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={28} color="#c00" />
      </Pressable>

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 180,
          paddingTop: 65,
        }}
      >
        <Text style={styles.title}>
          {id ? "Edit wardrobe item" : "Add wardrobe item"}
        </Text>

        <Text style={styles.section}>Item details</Text>

        <View style={styles.card}>
          <RowInput label="Name" value={name} onChangeText={setName} />

          {/* BRAND */}
          <View style={styles.row}>
            <Text style={styles.label}>Brand</Text>
            <View style={{ flex: 1 }}>
              <TextInput
                value={brand}
                onChangeText={(t) => {
                  setBrand(t);
                  setShowBrandSuggest(true);
                }}
                onBlur={() =>
                  setTimeout(() => setShowBrandSuggest(false), 150)
                }
                style={styles.input}
                placeholder="Brand"
              />
              {showBrandSuggest && brandSuggest.length > 0 && (
                <View style={styles.brandSuggestBox}>
                  {brandSuggest.map((b) => (
                    <Pressable
                      key={b}
                      onPress={() => {
                        setBrand(b);
                        setShowBrandSuggest(false);
                      }}
                      style={styles.brandSuggestItem}
                    >
                      <Text>{b}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          <RowInput label="Size" value={size} onChangeText={setSize} />

          <RowDropdown
            label="Color"
            open={colorOpen}
            setOpen={setColorOpen}
            value={color}
            setValue={setColor}
            items={colors}
            setItems={setColors}
            defaults={DEFAULT_COLORS}
            storageKey={STORAGE_KEYS.colors}
            zIndex={6000}
            zIndexInverse={3000}
          />

          <RowDropdown
            label="Fabric"
            open={fabricOpen}
            setOpen={setFabricOpen}
            value={fabric}
            setValue={setFabric}
            items={fabrics}
            setItems={setFabrics}
            defaults={DEFAULT_FABRICS}
            storageKey={STORAGE_KEYS.fabrics}
            zIndex={5000}
            zIndexInverse={3000}
          />

          <RowDropdown
            label="Category"
            open={catOpen}
            setOpen={setCatOpen}
            value={category}
            setValue={setCategory}
            items={categories}
            setItems={setCategories}
            defaults={DEFAULT_CATS}
            storageKey={STORAGE_KEYS.categories}
            zIndex={4000}
            zIndexInverse={3000}
          />

          <RowDropdown
            label="Season"
            open={seasonOpen}
            setOpen={setSeasonOpen}
            value={season}
            setValue={setSeason}
            items={seasons}
            setItems={setSeasons}
            defaults={DEFAULT_SEASONS}
            storageKey={STORAGE_KEYS.seasons}
            zIndex={3000}
            zIndexInverse={3000}
          />

          <RowInput
            label="Price"
            value={price}
            onChangeText={setPrice}
            placeholder="Enter price"
          />

          {/* IMAGE PICK */}
          <View style={[styles.row, { marginTop: 12 }]}>
            <Text style={styles.label}>Image</Text>
            <Pressable onPress={pickImage}>
              <Text style={styles.link}>Select</Text>
            </Pressable>
{imageUri && (
  <>
    <Pressable onPress={() => setPreviewVisible(true)}>
      <Image source={{ uri: imageUri }} style={styles.thumb} />
    </Pressable>

    <Pressable
      style={styles.removeBgBtn}
      onPress={() => setShowBgModal(true)}
    >
      <Ionicons name="cut" size={14} color="#fff" />
      <Text style={styles.removeBgTxt}>Remove BG</Text>
    </Pressable>
  </>
)}

          </View>

          {/* DATE */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Purchased</Text>
            <Pressable onPress={() => setShowDate(!showDate)}>
              <Text style={styles.input}>{date.toDateString()}</Text>
            </Pressable>
            {showDate && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(e, d) => {
                  setShowDate(false);
                  if (d) setDate(d);
                }}
              />
            )}
          </View>
        </View>

        <Text style={styles.section}>Location</Text>
        <View style={[styles.card, { zIndex: 200 }]}>
          <RowDropdown
            label="Location"
            open={locationOpen}
            setOpen={setLocationOpen}
            value={location}
            setValue={setLocation}
            items={places}
            setItems={setPlaces}
            defaults={DEFAULT_PLACES}
            storageKey={STORAGE_KEYS.places}
            zIndex={200}
            zIndexInverse={2000}
          />
        </View>

        <Text style={styles.section}>Voice Input</Text>

        <TextInput
          value={recognizedText}
          placeholder="Recognized text..."
          editable={false}
          multiline
          style={styles.voiceBox}
        />

        <Pressable
          onPress={isRecording ? stopRecording : startRecording}
          style={styles.voiceBtn}
        >
          <Text style={styles.voiceTxt}>
            {isRecording ? "Stop Voice Input" : "Start Input by Voice"}
          </Text>
        </Pressable>

        <Pressable style={styles.saveBtn} onPress={onSave}>
          <Text style={styles.saveTxt}>Save</Text>
        </Pressable>
      </ScrollView>
      {/* IMAGE PREVIEW MODAL */}
<Modal visible={previewVisible} transparent animationType="fade">
  <Pressable
    style={styles.modalOverlay}
    onPress={() => setPreviewVisible(false)}
  >
    <Image
      source={{ uri: imageUri! }}
      style={styles.previewImg}
    />
  </Pressable>
</Modal>


      {/* REMOVE BG MODAL */}
      <Modal visible={showBgModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {bgLoading && <ActivityIndicator size="large" />}
            {!bgPreviewUri && imageUri && (
              <Image source={{ uri: imageUri }} style={styles.modalImg} />
            )}
            {bgPreviewUri && (
              <Image source={{ uri: bgPreviewUri }} style={styles.modalImg} />
            )}

            {!bgPreviewUri && !bgLoading && (
<Pressable style={styles.modalPrimaryBtn} onPress={handleRemoveBg}>
  <Text style={styles.modalPrimaryTxt}>Remove Background</Text>
</Pressable>

            )}

<View style={styles.modalRow}>
  <Pressable
    style={styles.modalGhostBtn}
    onPress={() => setShowBgModal(false)}
  >
    <Text>Cancel</Text>
  </Pressable>

  {bgPreviewUri && (
    <Pressable
      style={styles.modalConfirmBtn}
      onPress={() => {
        setImageUri(bgPreviewUri);
        setShowBgModal(false);
      }}
    >
      <Text style={{ color: "#fff" }}>Confirm</Text>
    </Pressable>
  )}
</View>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  title: {
    fontSize: 33,
    fontFamily: "ProductSans-Bold",
    marginBottom: 12,
  },
  section: {
    color: "#888",
    fontSize: 20,
    fontFamily: "ProductSans",
    marginVertical: 10,
  },
  card: {
    backgroundColor: "#fafafa",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    width: 90,
    fontFamily: "ProductSans-Bold",
    fontSize: 14,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#999",
    padding: 10,
    borderRadius: 8,
    fontFamily: "ProductSans",
  },
  dropdown: {
    borderColor: "#aaa",
    backgroundColor: "#fff",
    minHeight: 42,
  },
  addBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 6,
  },
  saveSmallBtn: {
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginLeft: 10,
  },
  link: {
    color: "#325a86",
    fontFamily: "ProductSans-Bold",
    marginRight: 8,
  },
  saveBtn: {
    backgroundColor: "#c00",
    padding: 16,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: 24,
    width: 200,
  },
  saveTxt: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontFamily: "ProductSans-Bold",
  },
  voiceBtn: {
    backgroundColor: "#f3f3f3",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: 10,
  },
  voiceTxt: {
    color: "#666",
    fontFamily: "ProductSans-Bold",
    fontSize: 14,
  },
  voiceBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    minHeight: 70,
    backgroundColor: "#fafafa",
    fontFamily: "ProductSans",
    marginBottom: 8,
  },
  backBtn: {
    position: "absolute",
    left: 15,
    padding: 6,
    zIndex: 999,
  },
  brandSuggestBox: {
    position: "absolute",
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    zIndex: 9999,
  },
  brandSuggestItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  removeBgBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#c00000",
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    width: 280,
  },
  modalImg: {
    width: 200,
    height: 200,
    resizeMode: "contain",
    marginBottom: 12,
  },
  removeBgTxt: {
  color: "#fff",
  marginLeft: 4,
  fontSize: 12,
  fontFamily: "ProductSans-Bold",
},

previewImg: {
  width: "90%",
  height: "70%",
  resizeMode: "contain",
},

modalPrimaryBtn: {
  backgroundColor: "#c00",
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 10,
  marginTop: 12,
},

modalPrimaryTxt: {
  color: "#fff",
  fontFamily: "ProductSans-Bold",
},

modalRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  width: "100%",
  marginTop: 16,
},

modalGhostBtn: {
  padding: 8,
},

modalConfirmBtn: {
  backgroundColor: "#000",
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 10,
},

});
