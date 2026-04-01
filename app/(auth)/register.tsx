import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../config/firebaseConfig";

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  async function handleRegister() {
    if (!email.trim() || !password || !confirm) {
      return Alert.alert("Error", "Please fill all fields");
    }

    if (password !== confirm) {
      return Alert.alert("Error", "Passwords do not match");
    }

    try {
      await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      Alert.alert("Success", "Account created successfully");
      router.replace("/login");
    } catch (err: any) {
      Alert.alert("Sign up failed", err.message);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Register</Text>

      {/* Email */}
      <View style={styles.inputRow}>
        <Ionicons name="mail-outline" size={20} color="#aaa" />
        <TextInput
          placeholder="Email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
      </View>

      {/* Password */}
      <View style={styles.inputRow}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color="#aaa"
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {/* Confirm */}
      <View style={styles.inputRow}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color="#aaa"
        />
        <TextInput
          placeholder="Confirm password"
          secureTextEntry
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
        />
      </View>

      {/* Register */}
      <Pressable
        style={styles.loginBtn}
        onPress={handleRegister}
      >
        <Text style={styles.loginText}>
          Create account
        </Text>
      </Pressable>

      {/* Footer */}
      <Text style={styles.footerText}>
        Already have an account?{" "}
        <Text
          style={styles.linkText}
          onPress={() => router.push("/login")}
        >
          Login
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

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  input: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    fontFamily: "ProductSans-Bold",
  },

  loginBtn: {
    backgroundColor: "#C00000",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  loginText: {
    color: "#fff",
    fontFamily: "ProductSans-Bold",
    fontSize: 16,
  },

  footerText: {
    textAlign: "center",
    marginTop: 20,
    color: "#555",
    fontFamily: "ProductSans",
  },

  linkText: {
    color: "#C00000",
    fontFamily: "ProductSans-Bold",
  },
});
