// packing/add.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function AddPacking() {
  const router = useRouter();
  const [listName, setListName] = useState('');

  async function createPacking() {
    const trimmed = listName.trim();
    if (!trimmed) {
      Alert.alert('Please enter a name');
      return;
    }

    const key = `packing_${trimmed}`;
    const exists = await AsyncStorage.getItem(key);
    if (exists) {
      Alert.alert('Duplicate', 'This packing list already exists.');
      return;
    }

    await AsyncStorage.setItem(key, JSON.stringify([])); // ✅ create empty list
    setListName(''); // 🧹 clear field after save
    Alert.alert('Created!', `${trimmed} packing list created.`);
    router.push('/(tabs)/packing'); // กลับไปหน้า list
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 20 }}>
        <Ionicons name="arrow-back" size={22} color="#C00000" />
      </Pressable>

      <Text style={styles.title}>New packing list</Text>

      <TextInput
        placeholder="Name your list..."
        value={listName}
        onChangeText={setListName}
        style={styles.input}
      />

      <Pressable style={styles.btn} onPress={createPacking}>
        <Text style={styles.btnText}>Create packing list</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', padding: 20 },
  title: {
    fontFamily: 'ProductSans-Bold',
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 30,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 14,
    fontFamily: 'ProductSans',
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  btn: {
    backgroundColor: '#C00000',
    paddingVertical: 14,
    borderRadius: 12,
    alignSelf: 'center',
    width: 220,
  },
  btnText: {
    color: '#fff',
    fontFamily: 'ProductSans-Bold',
    textAlign: 'center',
    fontSize: 15,
  },
});
