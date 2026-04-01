// app/(tabs)/wardrobe/list.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useFonts } from 'expo-font';
import { loadLooks } from '@/lib/storage';
import { auth, db } from "../../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}


interface WardrobeItem {
  id: string;
  name: string;
  brand: string;
  color: string;
  size?: string;
  price?: number;
  imageUri: string;
  category?: string;
  fabric?: string;
  season?: string;
  location?: string;
}



const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

export default function WardrobeListScreen() {
  const [fontsLoaded] = useFonts({
    ProductSans: require('../../../assets/fonts/ProductSans-Regular.ttf'),
    'ProductSans-Bold': require('../../../assets/fonts/ProductSans-Bold.ttf'),
  });

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [packings, setPackings] = useState<{ [key: string]: string[] }>({});
  const [nearestLook, setNearestLook] = useState<any>(null);
  const [username, setUsername] = useState<string>("");
  const [upcomingOpen, setUpcomingOpen] = useState(true);


  const [editingProfile, setEditingProfile] = useState(false);

  

  type AiPreset = {
    id: string;
    title: string;
    outfit: string[];
    createdAt: number;
  };

  const AI_PRESET_KEY = 'ai_presets';

  const [aiPresets, setAiPresets] = useState<AiPreset[]>([]);

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadItems();
      loadPackings();
      loadAiPresets();
      loadUsernameFromCloud();

      (async () => {
        const looks = await loadLooks();
        const priorityLook = findPriorityLook(looks || {});
        setNearestLook(priorityLook);

      })();
    }, [])
  );

  async function loadUsernameFromCloud() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setUsername(snap.data().username);
      }
    } catch (e) {
      console.log("❌ load username failed", e);
    }
  }


  async function loadAiPresets() {
    try {
      const raw = await AsyncStorage.getItem(AI_PRESET_KEY);
      setAiPresets(raw ? JSON.parse(raw) : []);
    } catch {
      setAiPresets([]);
    }
  }


  async function loadItems() {
    const data = await AsyncStorage.getItem('wardrobeItems');
    setItems(data ? JSON.parse(data) : []);
  }

  async function loadPackings() {
    const keys = await AsyncStorage.getAllKeys();
    const packingKeys = keys.filter((k) => k.startsWith('packing_'));
    const allPackings: any = {};

    for (const key of packingKeys) {
      const data = await AsyncStorage.getItem(key);
      const parsed = data ? JSON.parse(data) : [];
      const previewImgs = parsed.slice(0, 3).map((i: any) => i.imageUri);
      allPackings[key.replace('packing_', '')] = previewImgs;
    }

    setPackings(allPackings);
  }
  function getPresetPreview(preset: AiPreset) {
    return preset.outfit
      .map(id => items.find(i => i.id === id)?.imageUri)
      .filter(Boolean)
      .slice(0, 3);
  }



  function getLocalDateKey(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function findPriorityLook(looks: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayKey = getLocalDateKey(today);

    // 1️⃣ LOOK วันนี้
    if (looks[todayKey] && looks[todayKey].length > 0) {
      return {
        date: todayKey,
        look: looks[todayKey][0],
        type: 'today',
      };
    }

    // 2️⃣ UPCOMING
    let upcoming: any = null;
    let minDiff = Infinity;

    Object.entries(looks).forEach(([date, lookList]: any) => {
      if (!lookList || lookList.length === 0) return;

      const d = new Date(date);
      d.setHours(0, 0, 0, 0);

      if (d <= today) return;

      const diff = d.getTime() - today.getTime();

      if (diff < minDiff) {
        minDiff = diff;
        upcoming = {
          date,
          look: lookList[0],
          type: 'upcoming',
        };
      }
    });

    return upcoming;
  }

  if (!fontsLoaded) return null;
;


  return (
    <SafeAreaView style={styles.container}>

        {/* 0: Header */}
        <View style={styles.header}>
          {/* LEFT */}
          <View style={styles.headerSide}>
  <Pressable
    onPress={() => router.push("/(tabs)/profile")}
    style={{
      width: 52,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <View style={{ position: 'relative' }}>
      {/* Avatar */}
      <View style={styles.profileIcon}>
        <Ionicons name="person" size={28} color="#fff" />
      </View>

      {/* ✏️ Pencil — อยู่ "ในกรอบ" */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          right: -7,
          backgroundColor: '#fff',
          borderRadius: 999,
          padding: 4,
          elevation: 2,
        }}
      >
        <Ionicons name="pencil" size={12} color="#C00000" />
      </View>
    </View>
  </Pressable>
</View>


          {/* CENTER */}
          <Text style={styles.logoText}>OUCH FIT</Text>

          {/* RIGHT */}
          <View style={[styles.headerSide, { justifyContent: 'flex-end' }]}>
            <Pressable
              style={styles.searchBtn}
              onPress={() => router.push('/tutorial')}
            >
              <Ionicons name="help-circle-outline" size={20} color="#000" />
            </Pressable>
          </View>

        </View>
 <ScrollView
    showsVerticalScrollIndicator={false}
    contentContainerStyle={{ paddingBottom: 120 }} // เผื่อ FAB
  >

<View style={{ marginTop: 16 }}>
  <Text style={styles.greeting}>
    Hi, {username || "there"}
  </Text>
  
  <Text style={styles.subGreeting}>Let’s get dress!</Text>
</View>



        {/* ⭐ UPCOMING LOOK */}
        
        <View style={{ marginTop: 20 }}>
          <Pressable
  style={[styles.rowBetween, { marginTop: 0 }]}
  onPress={() => {
    LayoutAnimation.easeInEaseOut();
    setUpcomingOpen(v => !v);
  }}
>
            <Text style={styles.sectionTitle}>
              {nearestLook?.type === 'today'
                ? "Today's Look"
                : 'Upcoming Look'}
            </Text>

            <Ionicons
              name={upcomingOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#000"
            />
          </Pressable>

          {upcomingOpen && (
            <>
              {nearestLook ? (
                <Pressable
                  style={{
                    marginTop: 10,
                    borderRadius: 22,
                    overflow: 'hidden',
                    backgroundColor: '#eee',
                  }}
                  onPress={() =>
                    router.push(`/calendar?date=${nearestLook.date}`)
                  }
                >
                  <Image
                    source={{ uri: nearestLook.look.imageUri }}
                    style={{ width: '100%', height: 220 }}
                    resizeMode="cover"
                  />

              {/* วันที่ */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Text
                      style={{
                        color: '#fff',
                        fontFamily: 'ProductSans-Bold',
                        fontSize: 12,
                      }}
                    >
                      {nearestLook.type === 'today'
                        ? 'Today'
                        : nearestLook.date}
                    </Text>


              </View>
            </Pressable>
          ) : (
            /* 🧠 EMPTY STATE */
            <View
              style={{
                marginTop: 12,
                padding: 20,
                borderRadius: 22,
                backgroundColor: '#fff',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'ProductSans-Bold',
                  fontSize: 16,
                  marginBottom: 6,
                }}
              >
                No upcoming look
              </Text>

              <Text
                style={{
                  fontFamily: 'ProductSans',
                  fontSize: 13,
                  color: '#777',
                  textAlign: 'center',
                  marginBottom: 14,
                }}
              >
                Try planning your outfit ahead ✨
              </Text>

              <Pressable
                onPress={() => router.push('/calendar')}
                style={{
                  backgroundColor: '#C00000',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 999,
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontFamily: 'ProductSans-Bold',
                    fontSize: 14,
                  }}
                >
                  Plan a Look
                </Text>
              </Pressable>
            </View>
              )}
            </>
          )}
        </View>


      {/* ⭐ PACKING +  PRESETS WRAPPER */}
<View style={{ marginTop: 20 }}>

  {/* 3: Packing top */}
  <View style={styles.rowBetween}>
  <Text style={styles.sectionTitle}>Packing</Text>
  <Pressable onPress={() => router.push('/packing')}>
    <Text style={styles.linkAll}>All</Text>
  </Pressable>
</View>


  {/* 4: Packing cards */}
  <ScrollView horizontal showsHorizontalScrollIndicator={false}
  style={{ marginTop: 12 }}>
    <Pressable
  style={styles.packCard}
  onPress={() => router.push('/(tabs)/packing/add')}
  
>
  <Text style={styles.packTitle}>Create new Packing</Text>
  <View style={styles.plusCircle}>
    <Ionicons name="add-sharp" size={22} color="#C00000" />
  </View>
</Pressable>


    {Object.entries(packings).map(([key, imgs]) => (
      <Pressable key={key} style={styles.packCard} onPress={() => router.push(`/packing/${key}`)}>
        <Text style={styles.packTitle}>{key}</Text>

        <View style={styles.previewContainer}>
          <View>{imgs[0] && <Image source={{ uri: imgs[0] }} style={styles.previewBig} />}</View>
          <View style={{ justifyContent: 'space-between' }}>
            {imgs[1] && <Image source={{ uri: imgs[1] }} style={styles.previewSmall} />}
            {imgs[2] && <Image source={{ uri: imgs[2] }} style={styles.previewSmall} />}
          </View>
        </View>
      </Pressable>
    ))}
  </ScrollView>

  {/* ⭐ PRESETS */}
<View style={{ marginTop: 28 }}>
  {/* Header */}
  <View style={styles.rowBetween}>
    <Text style={styles.sectionTitle}>Presets</Text>
    <Pressable onPress={() => router.push('/preset')}>
      <Text style={styles.linkAll}>All</Text>
    </Pressable>
  </View>

  {/* Cards */}
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={{ marginTop: 12 }}
  >
    {/* ➕ Create new Preset */}
    <Pressable
  style={styles.packCard}
  onPress={() => router.push('/(tabs)/preset/add')}
>
  <Text style={styles.packTitle}>Create new Preset</Text>
  <View style={styles.plusCircle}>
    <Ionicons name="add-sharp" size={22} color="#C00000" />
  </View>
</Pressable>


    {/* Existing Presets */}
    {aiPresets.map((preset) => {
      const imgs = getPresetPreview(preset);

      return (
        <Pressable
          key={preset.id}
          style={styles.packCard}
          onPress={() => router.push(`/preset/${preset.id}`)}
        >
          <Text style={styles.packTitle} numberOfLines={2}>
            {preset.title}
          </Text>

          <View style={styles.previewContainer}>
            <View>
              {imgs[0] && (
                <Image
                  source={{ uri: imgs[0] }}
                  style={styles.previewBig}
                />
              )}
            </View>

            <View style={{ justifyContent: 'space-between' }}>
              {imgs[1] && (
                <Image
                  source={{ uri: imgs[1] }}
                  style={styles.previewSmall}
                />
              )}
              {imgs[2] && (
                <Image
                  source={{ uri: imgs[2] }}
                  style={styles.previewSmall}
                />
              )}
            </View>
          </View>
        </Pressable>
      );
    })}
  </ScrollView>
</View>


</View>
</ScrollView>

 {/* ✅ FAB ADD — ยังอยู่เหมือนเดิม */}
    <Pressable
      style={styles.fab}
      onPress={() => router.push('/wardrobe/add')}
    >
      <Ionicons name="add-sharp" size={28} color="#fff" />
    </Pressable>
    </SafeAreaView>
  );
}

// ===== STYLE (เหมือนของเดิมทุกตัว 100%) =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9', paddingHorizontal: 30 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
  },

  headerSide: {
    width: 80, // ❗ ต้อง fix ความกว้างซ้าย-ขวาเท่ากัน
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileIcon: {
    backgroundColor: '#C00000',
    width: 45,
    height: 45,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: 'ProductSans-Bold',
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  searchBtn: { backgroundColor: '#F3F3F3', borderRadius: 8, padding: 8 },

  greeting: { fontFamily: 'ProductSans-Bold', fontSize: 24, marginTop: 10 },
  subGreeting: { fontFamily: 'ProductSans', fontSize: 24, color: '#333' },

  linkAll: { fontFamily: 'ProductSans-Bold', color: '#C00000', fontSize: 16 },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginTop: 20,
  },

  sectionTitle: { fontFamily: 'ProductSans-Bold', fontSize: 16 },
  editBtnText: { fontFamily: 'ProductSans-Bold', fontSize: 15 },

  packCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginRight: 12,
    width: 136,
    height: 125,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },

  packTitle: { fontFamily: 'ProductSans-Bold', fontSize: 16, color: '#000' },
  plusCircle: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#C00000',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    width: '100%',
    justifyContent: 'space-between',
  },

  previewBig: { width: 64, height: 64 },
  previewSmall: { width: 30, height: 30 },

  catItem: { alignItems: 'center', marginRight: 16 },

  catCircle: {
    backgroundColor: '#C00000',
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCircleActive: {
    opacity: 0.7,
  },
  catText: {
    fontFamily: 'ProductSans-Bold',
    fontSize: 13,
    color: '#000',
    marginTop: 6,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  itemCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 18,
    padding: 12,
    position: 'relative',
  },

  itemImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: '#ffffffff',
  },

  itemName: { fontFamily: 'ProductSans-Bold', fontSize: 14, marginTop: 8 },
  itemBrand: { fontFamily: 'ProductSans', fontSize: 12, color: '#444' },
  itemDesc: {
    fontFamily: 'ProductSans',
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },

  heartBtn: { position: 'absolute', bottom: 10, right: 10 },

  trashBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#C00000',
    padding: 6,
    borderRadius: 16,
  },

  noItem: {
    textAlign: 'center',
    color: '#888',
    fontFamily: 'ProductSans',
    marginTop: 40,
  },

  fab: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    backgroundColor: '#C00000',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchOverlay: {
    marginTop: 12,
    marginBottom: 8,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },

  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    fontFamily: 'ProductSans',
    fontSize: 14,
    color: '#000',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  previewCard: {
    width: '74%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 14,
  },

  previewClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
  },

  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 10,
  },

  previewName: {
    fontFamily: 'ProductSans-Bold',
    fontSize: 18,
  },

  previewBrand: {
    fontFamily: 'ProductSans',
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },

  previewEditBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C00000',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 16, // ⭐ ดันออกจาก content
  },


  previewEditTxt: {
    color: '#fff',
    fontFamily: 'ProductSans-Bold',
    fontSize: 14,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  infoLabel: {
    fontSize: 12, // ⬇️
  },

  infoValue: {
    fontFamily: 'ProductSans-Bold',
    fontSize: 15,
    color: '#000',
  },

  primaryBlock: {
    marginTop: 8,
    gap: 6,
  },

  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },

  secondaryBlock: {
    marginTop: 4,
    gap: 4,
    opacity: 0.75,
  },

});
