import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  Alert,
  ScrollView,
} from 'react-native'
import { Calendar } from 'react-native-calendars'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { loadLooks, removeSingleLook } from '@/lib/storage'
import { Ionicons } from '@expo/vector-icons'
import { useFonts } from 'expo-font'
import { getItemById } from '@/lib/wardrobe'

import {
  fetchWeather,
  getWeatherIcon,
  formatTemp,
  getFallbackWeather,
} from '@/lib/weather'

const { width } = Dimensions.get('window')

const H_PADDING = 8
const GAP = 2
const CELL_WIDTH = (width - H_PADDING * 2 - GAP * 6) / 7
function FullItemRow({ itemId }: { itemId: string }) {
  const [item, setItem] = useState<any>(null)

  useEffect(() => {
    ; (async () => {
      const found = await getItemById(itemId)
      setItem(found)
    })()
  }, [itemId])

  if (!item) return null

  return (
    <View style={styles.itemRow}>
      <Image source={{ uri: item.imageUri }} style={styles.itemImg} />
      <Text style={styles.itemName}>{item.name}</Text>
    </View>
  )
}
function safeImage(uri: string | null, style: any) {
  if (!uri) return <View style={[style, { backgroundColor: '#eee' }]} />
  return <Image source={{ uri }} style={style} />
}

export default function CalendarScreen() {
  const [fontsLoaded] = useFonts({
    ProductSans: require('@/assets/fonts/ProductSans-Regular.ttf'),
    'ProductSans-Bold': require('@/assets/fonts/ProductSans-Bold.ttf'),
  })

  const [looks, setLooks] = useState<any>({})
  const [selected, setSelected] = useState('')
  const [showDetail, setShowDetail] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [weather, setWeather] = useState<any>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [activeLook, setActiveLook] = useState<any>(null)
  const router = useRouter()

  // ⭐ ใช้ scale แทน height (ปลอดภัยสุด)
  const scaleAnim = useRef(new Animated.Value(1)).current

  /* LOAD */
  useFocusEffect(
    React.useCallback(() => {
      ; (async () => {
        const data = await loadLooks()
        setLooks(data || {})
      })()
    }, [])
  )

  useEffect(() => {
    ; (async () => {
      const w = await fetchWeather()
      setWeather(w || getFallbackWeather())
    })()
  }, [])

  /* SELECT */
  const onDayPress = (day: any) => {
    if (!day?.dateString) return

    // ⭐ toggle จริง (แก้บัค)
    if (selected === day.dateString) {
      const next = !showDetail
      setShowDetail(next)
      setEditMode(false)

      Animated.spring(scaleAnim, {
        toValue: next ? 0.93 : 1,
        useNativeDriver: true,
      }).start()

      return
    }

    setSelected(day.dateString)
    setShowDetail(true)
    setEditMode(false)

    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
    }).start()
  }
  const openModal = (look: any) => {
    setActiveLook(look)
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setActiveLook(null)
  }
  /* DELETE */
  const handleDelete = async (id: string) => {
    Alert.alert('Delete Look', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeSingleLook(selected, id)
          const updated = await loadLooks()
          setLooks(updated)
        },
      },
    ])
  }

  if (!fontsLoaded) return null

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.bigDate}>
            {new Date().toDateString()}
          </Text>

          <View style={styles.weatherRow}>
            <Ionicons
              name={getWeatherIcon(weather?.weathercode || 0) as any}
              size={26}
              color="#C00000"
            />
            <Text style={styles.bigTemp}>
              {formatTemp(weather?.temperature)}
            </Text>
          </View>
        </View>

        {/* CALENDAR */}
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            marginBottom: showDetail ? 10 : 0, // ⭐ ดัน spacing
          }}
        >
          <Calendar
            style={styles.calendar}
            onDayPress={onDayPress}
            hideExtraDays={false}
            theme={{
              monthTextColor: '#000',
              arrowColor: '#C00000',
              todayTextColor: '#C00000',
              textMonthFontFamily: 'ProductSans-Bold',
              textDayFontFamily: 'ProductSans',
            }}
            dayComponent={({ date }) => {
              if (!date?.dateString) return null

              const look = looks?.[date.dateString]?.[0]
              const isSelected = selected === date.dateString

              return (
                <Pressable
                  onPress={() => onDayPress(date)}
                  style={[
                    styles.cell,
                    { width: CELL_WIDTH, aspectRatio: 0.65 }, // ⭐ ไม่ fix height
                    look && styles.cellWithImage,
                    isSelected && styles.cellSelected,
                  ]}
                >
                  {look?.imageUri && (
                    <Image
                      source={{ uri: look.imageUri }}
                      style={styles.cellImage}
                    />
                  )}
                  <Text style={styles.dateOverlay}>{date.day}</Text>
                </Pressable>
              )
            }}
          />
        </Animated.View>

        {/* DETAIL */}
        {showDetail && selected && (
          <View style={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <Text style={styles.selectedDate}>{selected}</Text>

              {looks[selected]?.length > 0 && (
                <Pressable onPress={() => setEditMode(v => !v)}>
                  <Ionicons
                    name={editMode ? 'close' : 'create-outline'}
                    size={20}
                    color="#000"
                  />
                </Pressable>
              )}
            </View>

            <View style={styles.cardGrid}>
              {looks[selected]?.map((item: any) => (
                <Pressable
                  key={item.id}
                  style={styles.card}
                  onPress={() => openModal(item)}
                >
                  {safeImage(item.imageUri, styles.cardImg)}

                  {editMode && (
                    <>
                      <Pressable
                        style={styles.cardEdit}
                        onPress={() =>
                          router.push({
                            pathname: '/calendar/add',
                            params: {
                              date: selected,
                              lookId: item.id,
                            },
                          })
                        }
                      >
                        <Ionicons name="create" size={14} color="#fff" />
                      </Pressable>

                      <Pressable
                        style={styles.cardDelete}
                        onPress={() => handleDelete(item.id)}
                      >
                        <Ionicons name="trash" size={14} color="#fff" />
                      </Pressable>
                    </>
                  )}
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/calendar/add',
                  params: {
                    date: selected,
                    reset: 'true',
                  },
                })
              }
              style={styles.addBtn}
            >
              <Text style={styles.addTxt}>+ Add Look</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      {modalVisible && activeLook && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* CLOSE */}
            <Pressable style={styles.modalClose} onPress={closeModal}>
              <Ionicons name="close" size={22} color="#000" />
            </Pressable>

            {/* IMAGE */}
            <Image
              source={{ uri: activeLook.imageUri }}
              style={styles.modalImage}
            />

            {/* 🔥 ITEM LIST (กลับมาแล้ว) */}
            <ScrollView style={{ marginTop: 10 }}>
              {activeLook.items?.map((id: string, idx: number) => (
                <FullItemRow key={idx} itemId={id} />
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

/* STYLE */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9F9F9' },

  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },

  bigDate: {
    fontFamily: 'ProductSans-Bold',
    fontSize: 22,
  },

  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  bigTemp: {
    fontFamily: 'ProductSans-Bold',
    fontSize: 20,
    marginLeft: 6,
  },

  calendar: {
    width: '100%',
    backgroundColor: '#fff',
    paddingHorizontal: H_PADDING,
  },

  cell: {
    margin: GAP,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 0.6,
    borderColor: '#E5E5E5',
  },

  cellWithImage: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },

  cellSelected: {
    borderWidth: 2,
    borderColor: '#C00000',
  },

  cellImage: {
    width: '100%',
    height: '100%',
  },

  dateOverlay: {
    position: 'absolute',
    top: 4,
    left: 5,
    fontSize: 10,
    fontFamily: 'ProductSans-Bold',
  },

  detailContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  selectedDate: {
    fontFamily: 'ProductSans-Bold',
    fontSize: 16,
  },

  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  card: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },

  cardImg: {
    width: '100%',
    height: '100%',
  },

  cardEdit: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#000',
    padding: 6,
    borderRadius: 20,
  },

  cardDelete: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ff3b30',
    padding: 6,
    borderRadius: 20,
  },

  addBtn: {
    backgroundColor: '#C00000',
    padding: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 16,
  },

  addTxt: {
    color: '#fff',
    fontFamily: 'ProductSans-Bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCard: {
    width: '80%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
  },

  modalClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },

  modalImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  itemImg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },

  itemName: {
    fontFamily: 'ProductSans',
  },
})