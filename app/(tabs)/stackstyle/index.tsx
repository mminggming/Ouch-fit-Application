import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFonts } from 'expo-font'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { loadWardrobe } from '@/lib/wardrobe'

const { width, height } = Dimensions.get('window')
const AI_PRESET_KEY = 'ai_presets'

/* ================= STACK ICON ================= */
const StackIcon = ({ count, active }: { count: number; active: boolean }) => (
  <View style={{ width: 26, height: 20 }}>
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          position: 'absolute',
          bottom: i * 3,
          left: i * 2,
          width: 18,
          height: 10,
          borderRadius: 3,
          backgroundColor: active ? '#fff' : '#C00000',
          opacity: 1 - i * 0.2,
        }}
      />
    ))}
  </View>
)

export default function StylingScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [fontsLoaded] = useFonts({
    ProductSans: require('../../../assets/fonts/ProductSans-Regular.ttf'),
    'ProductSans-Bold': require('../../../assets/fonts/ProductSans-Bold.ttf'),
  })

  const [rowCount, setRowCount] = useState<2 | 3 | 4>(3)
  const [categories, setCategories] = useState<string[]>([])
  const [allItems, setAllItems] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([])

  const [saveModal, setSaveModal] = useState(false)
  const [presetName, setPresetName] = useState('')

  /* ================= LOAD ================= */
  const loadData = useCallback(async () => {
    const items = await loadWardrobe()
    setAllItems(items)

    const cats = Array.from(
      new Set(items.map((i) => (i.category || '').toLowerCase()))
    ).filter(Boolean)

    setCategories(cats)

    const initialRows = Array.from({ length: rowCount }).map((_, i) => {
      const cat = cats[i] || cats[0]

      const filtered = items.filter((it) =>
        (it.category || '').toLowerCase().includes(cat)
      )

      return {
        category: cat,
        items: filtered,
        index: Math.floor(filtered.length / 2),
        open: false,
      }
    })

    setRows(initialRows)
  }, [rowCount])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (!fontsLoaded) return null

  /* ================= SIZE (🔥 FIX จริง) ================= */

  const TOP_UI = 160 // header + stack + dropdown
  const usableHeight =
    height - insets.top - insets.bottom - TOP_UI

  const rowHeight = usableHeight / rowCount
  const centerSize = Math.min(rowHeight * 0.9, width * 0.55)
  const sideSize = centerSize * 0.55

  /* ================= ACTION ================= */

  const moveItem = (rowIndex: number, dir: 'left' | 'right') => {
    const updated = [...rows]
    const row = updated[rowIndex]

    if (dir === 'left' && row.index > 0) row.index--
    if (dir === 'right' && row.index < row.items.length - 1) row.index++

    setRows(updated)
  }

  const toggleDropdown = (i: number) => {
    const updated = rows.map((r, idx) => ({
      ...r,
      open: idx === i ? !r.open : false,
    }))
    setRows(updated)
  }

  const selectCategory = (i: number, cat: string) => {
    const filtered = allItems.filter((it) =>
      (it.category || '').toLowerCase().includes(cat)
    )

    const updated = [...rows]
    updated[i] = {
      ...updated[i],
      category: cat,
      items: filtered,
      index: Math.floor(filtered.length / 2),
      open: false,
    }

    setRows(updated)
  }

  const closeAllDropdown = () => {
    setRows(prev => prev.map(r => ({ ...r, open: false })))
  }

  const getSelectedItems = () =>
    rows.map((r) => r.items[r.index]?.id).filter(Boolean)

  const handleCreatePreset = async () => {
    const trimmed = presetName.trim()
    if (!trimmed) return Alert.alert('Please enter a name')

    const selected = getSelectedItems()

    const raw = await AsyncStorage.getItem(AI_PRESET_KEY)
    const presets = raw ? JSON.parse(raw) : []

    const newPreset = {
      id: Date.now().toString(),
      title: trimmed,
      outfit: selected,
      createdAt: Date.now(),
    }

    await AsyncStorage.setItem(
      AI_PRESET_KEY,
      JSON.stringify([newPreset, ...presets])
    )

    setPresetName('')
    setSaveModal(false)
    router.push('/(tabs)/preset')
  }

  /* ================= RENDER ================= */

  const renderRow = (row: any, i: number) => {
    if (!row.items.length) return null

    const center = row.items[row.index]
    const left = row.items[row.index - 1]
    const right = row.items[row.index + 1]

    return (
      <View key={i} style={[styles.rowBlock, { height: rowHeight }]}>
        {left && (
          <Pressable onPress={() => moveItem(i, 'left')} style={styles.sideLeft}>
            <Image
              source={{ uri: left.imageUri }}
              style={{ width: sideSize, height: sideSize, opacity: 0.4 }}
              resizeMode="contain"
            />
          </Pressable>
        )}

        {right && (
          <Pressable onPress={() => moveItem(i, 'right')} style={styles.sideRight}>
            <Image
              source={{ uri: right.imageUri }}
              style={{ width: sideSize, height: sideSize, opacity: 0.4 }}
              resizeMode="contain"
            />
          </Pressable>
        )}

        <View style={styles.centerWrapper}>
          {center && (
            <Image
              source={{ uri: center.imageUri }}
              style={{ width: centerSize, height: centerSize }}
              resizeMode="contain"
            />
          )}
        </View>
      </View>
    )
  }

  const rowOptions = [2, 3, 4]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#C00000" />
          </Pressable>

          <Text style={styles.logoText}>Styling</Text>

          <Pressable style={styles.saveBtn} onPress={() => setSaveModal(true)}>
            <Ionicons name="bookmark" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* STACK */}
        <View style={styles.rowSelector}>
          {rowOptions.map((n) => {
            const active = rowCount === n
            return (
              <Pressable
                key={n}
                onPress={() => setRowCount(n as any)}
                style={[styles.rowBtn, active && styles.rowBtnActive]}
              >
                <StackIcon count={n} active={active} />
              </Pressable>
            )
          })}
        </View>

        {/* CATEGORY */}
        <View style={styles.topDropdownRow}>
          {rows.map((row, i) => (
            <View key={i} style={{ flex: 1 }}>
              <Pressable
                style={styles.dropdownBtn}
                onPress={() => toggleDropdown(i)}
              >
                <Text style={styles.dropdownText}>{row.category}</Text>
                <Ionicons name="chevron-down" size={14} />
              </Pressable>

              {row.open && (
                <>
                  <Pressable style={styles.backdrop} onPress={closeAllDropdown} />
                  <View style={styles.dropdownOverlay}>
                    {categories.map((cat) => (
                      <Pressable
                        key={cat}
                        onPress={() => selectCategory(i, cat)}
                        style={styles.dropdownItem}
                      >
                        <Text style={styles.dropdownItemText}>{cat}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </View>
          ))}
        </View>

        {/* ROWS */}
        {rows.map((row, i) => renderRow(row, i))}
      </ScrollView>

      {/* MODAL */}
      {saveModal && (
        <View style={styles.overlay}>
          <Pressable style={styles.bg} onPress={() => setSaveModal(false)} />
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New preset</Text>
            <TextInput
              placeholder="Name your outfit..."
              value={presetName}
              onChangeText={setPresetName}
              style={styles.input}
            />
            <Pressable style={styles.createBtn} onPress={handleCreatePreset}>
              <Text style={styles.createText}>Save</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

/* ================= STYLE ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },

  logoText: { fontFamily: 'ProductSans-Bold', fontSize: 16 },

  saveBtn: {
    backgroundColor: '#C00000',
    padding: 8,
    borderRadius: 999,
  },

  rowSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },

  rowBtn: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: '#fff',
  },

  rowBtnActive: {
    backgroundColor: '#C00000',
  },

  topDropdownRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    zIndex: 1000,
  },

  dropdownBtn: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  dropdownText: {
    fontFamily: 'ProductSans-Bold',
    fontSize: 12,
  },

  dropdownOverlay: {
    position: 'absolute',
    top: 44,
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    elevation: 5,
  },

  dropdownItem: { paddingVertical: 6 },

  dropdownItemText: { textAlign: 'center' },

  backdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
  },

  rowBlock: { justifyContent: 'center' },

  centerWrapper: { alignItems: 'center' },

  sideLeft: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: [{ translateY: -50 }],
  },

  sideRight: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -50 }],
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  modal: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },

  modalTitle: {
    fontFamily: 'ProductSans-Bold',
    fontSize: 18,
    marginBottom: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },

  createBtn: {
    backgroundColor: '#C00000',
    padding: 14,
    borderRadius: 12,
  },

  createText: {
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'ProductSans-Bold',
  },
})