import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { auth, db } from "../config/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { ScrollView } from "react-native";

/* ================= TYPES ================= */

interface LoginHistory {
  device: string;
  platform: string;
  lastLogin?: Timestamp;
}

interface UserProfile {
  email: string;
  username: string;
  loginHistory?: LoginHistory[];
}

/* ================= HELPERS ================= */

function timeAgo(ts?: Timestamp) {
  if (!ts) return "unknown";

  const diff =
    Date.now() - ts.toDate().getTime();

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/* ================= SCREEN ================= */

export default function ProfileScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [profile, setProfile] =
    useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [history, setHistory] =
    useState<LoginHistory[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const snap = await getDoc(
        doc(db, "users", user.uid)
      );

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        setUsername(data.username);
        setHistory(data.loginHistory || []);
      }
    } catch (e) {
      console.log("❌ load profile failed", e);
    }
  }

  async function saveUsername() {
    if (!username.trim()) {
      return Alert.alert(
        "Profile",
        "Username cannot be empty"
      );
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      setSaving(true);

      await updateDoc(
        doc(db, "users", user.uid),
        { username: username.trim() }
      );

      inputRef.current?.blur();
      Keyboard.dismiss();

      Alert.alert("Profile", "Saved");
    } catch {
      Alert.alert("Profile", "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await auth.signOut();
            router.replace("/login");
          },
        },
      ]
    );
  }

  if (!profile) return null;

  const latestLogin =
    history.length > 0
      ? history[history.length - 1]
      : null;

  return (
  <SafeAreaView style={styles.container}>
    {/* HEADER */}
    <View style={styles.header}>
      <Pressable onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color="#000" />
      </Pressable>

      <Text style={styles.headerTitle}>Profile</Text>
      <View style={{ width: 26 }} />
    </View>

    {/* 👇 ADD SCROLL */}
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.card}>
        {/* AVATAR */}
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>

        {/* EMAIL */}
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{profile.email}</Text>

        {/* USERNAME */}
        <Text style={[styles.label, { marginTop: 16 }]}>
          Username
        </Text>

        <TextInput
          ref={inputRef}
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          autoCapitalize="none"
          editable={!saving}
        />

        {/* SAVE */}
        <Pressable
          style={[
            styles.saveBtn,
            saving && { opacity: 0.7 },
          ]}
          onPress={saveUsername}
          disabled={saving}
        >
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.saveText}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </Pressable>

        {/* LOGIN INFO */}
        <View style={{ marginTop: 28 }}>
          <Text style={styles.label}>Login history</Text>

          {latestLogin && (
            <Text style={styles.lastLogin}>
              Last login {timeAgo(latestLogin.lastLogin)}
            </Text>
          )}

          {history.length === 0 ? (
            <Text style={styles.emptyText}>
              No login history yet
            </Text>
          ) : (
            <View style={styles.historyList}>
              {history
                .slice(-5)
                .reverse()
                .map((h, idx) => (
                  <View key={idx} style={styles.historyItem}>
                    <View style={styles.historyLeft}>
                      <Ionicons
                        name={h.platform === "ios" ? "logo-apple" : "logo-android"}
                        size={16}
                        color="#C00000"
                      />
                      <Text style={styles.historyDevice}>
                        {h.device}
                      </Text>
                    </View>

                    <Text style={styles.historyTime}>
                      {timeAgo(h.lastLogin)}
                    </Text>
                  </View>

                ))}
            </View>
          )}
        </View>

        {/* LOGOUT */}
        <Pressable
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color="#C00000"
          />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </ScrollView>
  </SafeAreaView>
);

}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 30,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 20,
  },

  headerTitle: {
    fontFamily: "ProductSans-Bold",
    fontSize: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
  },

  avatar: {
    alignSelf: "center",
    backgroundColor: "#C00000",
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  label: {
    fontFamily: "ProductSans",
    fontSize: 13,
    color: "#777",
  },

  value: {
    fontFamily: "ProductSans-Bold",
    fontSize: 15,
    marginTop: 4,
  },

  input: {
    marginTop: 6,
    backgroundColor: "#F9F9F9",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "ProductSans-Bold",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#eee",
  },

  saveBtn: {
    marginTop: 24,
    backgroundColor: "#C00000",
    borderRadius: 999,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  saveText: {
    color: "#fff",
    fontFamily: "ProductSans-Bold",
    fontSize: 15,
  },

  lastLogin: {
    fontFamily: "ProductSans",
    fontSize: 12,
    color: "#555",
    marginTop: 4,
  },

  emptyText: {
    fontFamily: "ProductSans",
    fontSize: 13,
    color: "#999",
    marginTop: 10,
  },

  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: "#FFD6D6",
  },

  pillText: {
    fontFamily: "ProductSans-Bold",
    fontSize: 12,
    color: "#C00000",
  },

  logoutBtn: {
    marginTop: 32,
    borderRadius: 999,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#FFD6D6",
    backgroundColor: "#FFF",
  },

  logoutText: {
    fontFamily: "ProductSans-Bold",
    fontSize: 15,
    color: "#C00000",
  },
  historyList: {
    marginTop: 12,
    gap: 10,
  },

 historyItem: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between", // ⬅️ ดันเวลาไปขวาสุด
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 14,
  backgroundColor: "#FFF0F0",
  borderWidth: 1,
  borderColor: "#FFD6D6",
},

historyLeft: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
},

historyDevice: {
  fontFamily: "ProductSans-Bold",
  fontSize: 13,
  color: "#C00000",
},

historyTime: {
  fontFamily: "ProductSans",
  fontSize: 11,
  color: "#777",
},

});
