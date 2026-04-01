import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../config/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import Constants from "expo-constants";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

/* ================= GOOGLE CONFIG ================= */
const {
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} = Constants.expoConfig?.extra ?? {};

GoogleSignin.configure({
  iosClientId: GOOGLE_IOS_CLIENT_ID,
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

/* ================= HELPERS ================= */

// สร้าง profile ถ้ายังไม่มี
async function ensureUserProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const defaultUsername = user.email
      ? user.email.split("@")[0]
      : `user_${user.uid.slice(0, 6)}`;

    await setDoc(ref, {
      email: user.email,
      username: defaultUsername,
      createdAt: serverTimestamp(),
      loginHistory: [],
    });
  }
}

// บันทึก login history (❗ใช้ Timestamp.now)
async function recordLoginHistory() {
  const user = auth.currentUser;
  if (!user) return;

  const platform =
    Platform.OS === "ios"
      ? "ios"
      : Platform.OS === "android"
      ? "android"
      : "web";

  const device =
    platform === "ios"
      ? "iPhone"
      : platform === "android"
      ? "Android phone"
      : "Web browser";

  await updateDoc(doc(db, "users", user.uid), {
    loginHistory: arrayUnion({
      platform,
      device,
      lastLogin: Timestamp.now(), // ✅ สำคัญ
    }),
  });
}

/* ================= SCREEN ================= */

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= EMAIL LOGIN ================= */
  async function handleLogin() {
    if (!email || !password) {
      return Alert.alert("Login", "Please fill email and password");
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await ensureUserProfile();
      await recordLoginHistory();

      router.replace("/(tabs)/wardrobe/list");
    } catch (err: any) {
      Alert.alert("Login failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ================= GOOGLE LOGIN ================= */
  async function handleGoogleLogin() {
    try {
      setLoading(true);

      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();

      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error("No Google token");

      const credential =
        GoogleAuthProvider.credential(idToken);

      await signInWithCredential(auth, credential);

      await ensureUserProfile();
      await recordLoginHistory();

      router.replace("/(tabs)/wardrobe/list");
    } catch (err: any) {
      Alert.alert("Google login failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Login</Text>

      {/* Email */}
      <View style={styles.inputGroup}>
        <View style={styles.iconCircle}>
          <Ionicons name="mail-outline" size={20} color="#777" />
        </View>
        <View style={styles.inputBox}>
          <TextInput
            placeholder="Email"
            style={styles.inputText}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Password */}
      <View style={styles.inputGroup}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#777"
          />
        </View>
        <View style={styles.inputBox}>
          <TextInput
            placeholder="Password"
            secureTextEntry
            style={styles.inputText}
            value={password}
            onChangeText={setPassword}
          />
        </View>
      </View>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.line} />
      </View>

      {/* Google */}
      <Pressable
        style={styles.googleBtn}
        onPress={handleGoogleLogin}
        disabled={loading}
      >
        <Image
          source={require("../../assets/images/google_logo.png")}
          style={{ width: 18, height: 18, marginRight: 10 }}
        />
        <Text style={styles.googleText}>
          Continue with Google
        </Text>
      </Pressable>

      {/* Login */}
      <Pressable
        style={[
          styles.loginBtn,
          loading && { opacity: 0.7 },
        ]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.loginText}>
          {loading ? "Logging in..." : "Login"}
        </Text>
      </Pressable>

      {/* Register */}
      <Text style={styles.footerText}>
        Don’t have an account?{" "}
        <Text
          style={styles.linkText}
          onPress={() => router.push("/register")}
        >
          Register
        </Text>
      </Text>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
    padding: 30,
    justifyContent: "center",
  },
  title: {
    fontFamily: "ProductSans-Bold",
    fontSize: 26,
    textAlign: "center",
    marginBottom: 40,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  line: { flex: 1, height: 1, backgroundColor: "#ddd" },
  orText: { marginHorizontal: 10, color: "#888" },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 20,
  },
  googleText: {
    fontFamily: "ProductSans-Bold",
    color: "#555",
  },

  loginBtn: {
    backgroundColor: "#C00000",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  loginText: {
    color: "#fff",
    fontFamily: "ProductSans-Bold",
    fontSize: 16,
  },

  footerText: {
    marginTop: 20,
    textAlign: "center",
    fontFamily: "ProductSans",
    color: "#555",
  },
  linkText: {
    color: "#C00000",
    fontFamily: "ProductSans-Bold",
  },

  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 52,
    height: 49,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#9d9d9dff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginRight: 10,
  },
  inputBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#9d9d9dff",
    borderRadius: 36,
    backgroundColor: "#fff",
    height: 49,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  inputText: {
    fontSize: 12,
    color: "#212121ff",
    fontFamily: "ProductSans-Bold",
  },
});
