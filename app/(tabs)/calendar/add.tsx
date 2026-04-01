import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Image,
  ScrollView,
  Modal,
  Alert,
} from 'react-native'

import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler'

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated'

import ViewShot from 'react-native-view-shot'
import * as FS from 'expo-file-system/legacy'

import { Calendar } from 'react-native-calendars'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { loadItems } from '@/lib/wardrobe'
import { saveLook, loadLooks } from '@/lib/storage'

const { width, height } = Dimensions.get('window')

export default function CanvasScreen() {
  const { date, lookId, reset } = useLocalSearchParams<{
    date?: string
    lookId?: string
    reset?: string
  }>()

  const router = useRouter()
  const viewRef = useRef<ViewShot>(null)

  const isEditMode = !!lookId // ⭐ สำคัญ

  const [items, setItems] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [wardrobe, setWardrobe] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCat, setActiveCat] = useState('All')
  const [showPanel, setShowPanel] = useState(false)

  const [selectedDate, setSelectedDate] = useState(
    date || new Date().toISOString().split('T')[0]
  )
  useEffect(() => {
    if (date) {
      setSelectedDate(date)
    }
  }, [date])
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [isCapturing, setIsCapturing] = useState(false)

  /* ================= LOAD ================= */

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const data = await loadItems()
    setWardrobe(data)

    const cats = [
      'All',
      ...Array.from(
        new Set(
          data.map(i => i.category).filter((c): c is string => !!c)
        )
      ),
    ]

    setCategories(cats)
  }

  /* 🔥 RESET (ADD MODE ONLY) */
  useEffect(() => {
    if (reset === 'true') {
      setItems([])
      setSelectedId(null)
    }
  }, [reset])

  /* 🔥 LOAD EDIT */
  useEffect(() => {
    if (!lookId) return

      ; (async () => {
        const looks = await loadLooks()

        for (const key in looks) {
          const found = looks[key]?.find((l: any) => l.id === lookId)

          if (found) {
            const layout = (found.layout || []).map((i: any) => ({
              ...i,
              x: i.x ?? width / 2 - 60,
              y: i.y ?? height / 3,
              scale: i.scale ?? 1,
            }))

            setItems(layout)
            break
          }
        }
      })()
  }, [lookId])

  const filtered =
    activeCat === 'All'
      ? wardrobe
      : wardrobe.filter(i => i.category === activeCat)

  /* ================= ACTION ================= */

  const addItem = (item: any) => {
    if (!item.imageUri) return

    const newItem = {
      id: Date.now().toString(),
      uri: item.imageUri,
      itemId: item.id,
      x: width / 2 - 60,
      y: height / 3,
      scale: 1,
    }

    setItems(p => [...p, newItem])
    setSelectedId(newItem.id)
    setShowPanel(false)
  }

  const updateItemPosition = (id: string, x: number, y: number, scale: number) => {
    setItems(prev =>
      prev.map(i =>
        i.id === id ? { ...i, x, y, scale } : i
      )
    )
  }

  const deleteItem = () => {
    setItems(p => p.filter(i => i.id !== selectedId))
    setSelectedId(null)
  }

  /* ================= SAVE ================= */

  const handleSave = () => {
    setSelectedId(null)
    setIsCapturing(true)

    if (isEditMode) {
      setTimeout(confirmSave, 60)
    } else {
      setTimeout(() => setShowDatePicker(true), 60)
    }
  }

  const confirmSave = async () => {
    const base64 = await viewRef.current?.capture?.()
    if (!base64) return

    setIsCapturing(false)

    const dir = `${FS.documentDirectory}looks`
    await FS.makeDirectoryAsync(dir, { intermediates: true }).catch(() => { })

    const uri = `${dir}/look_${Date.now()}.png`

    await FS.writeAsStringAsync(uri, base64, {
      encoding: FS.EncodingType.Base64,
    })

    const itemIds: string[] = items
      .map(i => i.itemId)
      .filter((id): id is string => !!id)

    const finalDate = selectedDate

    await saveLook(finalDate, {
      id: lookId || Date.now().toString(), // 🔥 กัน id หาย
      items: itemIds,
      imageUri: uri,
      layout: items,
    })

    setShowDatePicker(false)
    router.replace('/(tabs)/calendar')
  }

  /* ================= UI ================= */

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>

        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() =>
              Alert.alert('Discard changes?', '', [
                { text: 'Cancel' },
                { text: 'Leave', onPress: () => router.replace('/(tabs)/calendar') },
              ])
            }
          >
            <Ionicons name="close" size={22} />
          </Pressable>

          <Text style={styles.title}>
            {isEditMode ? 'Edit Look' : 'Canvas'}
          </Text>

          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveTxt}>
              {isEditMode ? 'Save Changes' : 'Save'}
            </Text>
          </Pressable>
        </View>

        {/* CANVAS */}
        <Pressable style={styles.canvas} onPress={() => setSelectedId(null)}>
          <ViewShot
            ref={viewRef}
            options={{ format: 'png', quality: 1, result: 'base64' }}
            style={styles.canvasInner}
          >
            {items.map(item => (
              <DraggableItem
                key={item.id}
                item={item}
                selected={selectedId === item.id}
                onSelect={() => setSelectedId(item.id)}
                isCapturing={isCapturing}
                updateItemPosition={updateItemPosition}
              />
            ))}
          </ViewShot>
        </Pressable>

        {/* TOOLS */}
        {selectedId && (
          <View style={styles.sideTools}>
            <Tool icon="trash" onPress={deleteItem} />
          </View>
        )}

        {/* ADD BAR */}
        <Pressable style={styles.addBar} onPress={() => setShowPanel(v => !v)}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addTxt}>Add</Text>
        </Pressable>

        {/* PANEL */}
        {showPanel && (
          <View style={styles.panel}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map(cat => (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCat(cat)}
                  style={[
                    styles.cat,
                    activeCat === cat && styles.catActive,
                  ]}
                >
                  <Text>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView>
              <View style={styles.grid}>
                {filtered.map(item => (
                  <Pressable
                    key={item.id}
                    style={styles.gridItem}
                    onPress={() => addItem(item)}
                  >
                    <Image source={{ uri: item.imageUri }} style={styles.thumb} />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* DATE PICKER (เฉพาะ ADD) */}
        {!isEditMode && (
          <Modal visible={showDatePicker} transparent>
            <View style={styles.modalBg}>
              <View style={styles.modal}>
                <Calendar
                  current={selectedDate}

                  onDayPress={(d) => setSelectedDate(d.dateString)}

                  markedDates={{
                    [selectedDate]: {
                      selected: true,
                      selectedColor: '#C00000',
                      selectedTextColor: '#fff',
                    },
                  }}
                />
                <Pressable style={styles.confirm} onPress={confirmSave}>
                  <Text style={{ color: '#fff' }}>Save</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}

      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

const Tool = ({ icon, onPress }: any) => (
  <Pressable style={styles.toolBtn} onPress={onPress}>
    <Ionicons name={icon} size={18} color="#C00000" />
  </Pressable>
)

/* ================= STYLE ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },

  title: { fontSize: 18, fontWeight: '700' },

  saveBtn: {
    backgroundColor: '#C00000',
    padding: 10,
    borderRadius: 10,
  },

  saveTxt: { color: '#fff', fontWeight: '700' },

  canvas: { flex: 1, backgroundColor: '#fff' },
  canvasInner: { flex: 1, backgroundColor: '#fff' },

  item: { width: 120, height: 120, resizeMode: 'contain' },

  frame: {
    position: 'absolute',
    borderWidth: 1.2,
    borderColor: '#C00000',
    borderRadius: 10,
    width: '100%',
    height: '100%',
  },

  sideTools: {
    position: 'absolute',
    right: 12,
    top: height * 0.35,
    gap: 12,
  },

  toolBtn: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 20,
    elevation: 5,
  },

  addBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#C00000',
    alignItems: 'center',
    padding: 16,
  },

  addTxt: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  panel: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 12,
    maxHeight: height * 0.4,
  },

  cat: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },

  catActive: {
    backgroundColor: '#C00000',
    borderColor: '#C00000',
  },

  catTxt: { fontSize: 12 },
  catTxtActive: { color: '#fff' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },

  gridItem: {
    width: '25%',
    padding: 6,
  },

  thumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#eee',
  },

  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },

  modal: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 12,
  },

  confirm: {
    backgroundColor: '#C00000',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
})
function DraggableItem({
  item,
  selected,
  onSelect,
  isCapturing,
  updateItemPosition,
}: any) {
  const x = useSharedValue(item.x ?? width / 2 - 60)
  const y = useSharedValue(item.y ?? height / 3)
  const scale = useSharedValue(item.scale ?? 1)

  const startX = useSharedValue(x.value)
  const startY = useSharedValue(y.value)

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = x.value
      startY.value = y.value
    })
    .onUpdate(e => {
      x.value = startX.value + e.translationX
      y.value = startY.value + e.translationY
    })
    .onEnd(() => {
      runOnJS(updateItemPosition)(item.id, x.value, y.value, scale.value)
    })

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.max(0.5, Math.min(e.scale, 2))
    })
    .onEnd(() => {
      runOnJS(updateItemPosition)(item.id, x.value, y.value, scale.value)
    })

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x.value,
    top: y.value,
    transform: [{ scale: scale.value }],
  }))

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
      <Animated.View style={style}>
        <Pressable onPress={onSelect}>
          <Image source={{ uri: item.uri }} style={styles.item} />
          {selected && !isCapturing && <View style={styles.frame} />}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  )
}