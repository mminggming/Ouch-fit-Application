import React, { useEffect, useState } from "react"
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    TextInput,
    ScrollView,
    Modal,
    Dimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system"
import { auth, db } from "../config/firebaseConfig"
import { doc, getDoc, updateDoc } from "firebase/firestore"

import { loadLooks } from "@/lib/storage"
import { loadItems } from "@/lib/wardrobe"

const { width } = Dimensions.get("window")
const SIZE = (width - 48) / 3

export default function MeScreen() {
    const [username, setUsername] = useState("")
    const [editing, setEditing] = useState(false)

    const [profileImg, setProfileImg] = useState<string | null>(null)
    const [coverImg, setCoverImg] = useState<string | null>(null)

    const [wardrobe, setWardrobe] = useState<any[]>([])
    const [favorite, setFavorite] = useState<any[]>([])
    const [losing, setLosing] = useState<any[]>([])

    const [modalData, setModalData] = useState<any[]>([])
    const [modalVisible, setModalVisible] = useState(false)

    const [filters, setFilters] = useState<string[]>([])

    // 🔥 NEW STATES
    const [healthScore, setHealthScore] = useState(0)
    const [streak, setStreak] = useState(0)
    const [search, setSearch] = useState("")

    useEffect(() => {
        loadProfile()
        loadStats()
    }, [])

    async function loadProfile() {
        const user = auth.currentUser
        if (!user) return

        const snap = await getDoc(doc(db, "users", user.uid))
        if (snap.exists()) {
            const data = snap.data()
            setUsername(data.username)
            setProfileImg(data.profileImg || null)
            setCoverImg(data.coverImg || null)
        }
    }

    async function saveProfile() {
        const user = auth.currentUser
        if (!user) return

        await updateDoc(doc(db, "users", user.uid), {
            username,
            profileImg,
            coverImg,
        })

        setEditing(false)
    }

async function pickImage(setter: any, type: "profile" | "cover") {
    const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
    })

    if (res.canceled) return

    const uri = res.assets[0].uri

    try {
        const fileName = `${type}_${Date.now()}.jpg`

        // 🔥 FIX: cast ให้ TS ยอม
        const baseDir = (FileSystem as any).documentDirectory || ""
        const newPath = baseDir + fileName

        await (FileSystem as any).copyAsync({
            from: uri,
            to: newPath,
        })

        setter(newPath)

    } catch (e) {
        console.log("Image save error:", e)
    }
}

    async function loadStats() {
        const looks = await loadLooks()
        const items = await loadItems()
        setWardrobe(items)

        const countMap: Record<string, number> = {}

        // 🔥 STREAK
        let streakCount = 0
        const days = Object.keys(looks).sort().reverse()

        for (let i = 0; i < days.length; i++) {
            if (looks[days[i]].length > 0) streakCount++
            else break
        }
        setStreak(streakCount)

        Object.values(looks).forEach((day: any) => {
            day.forEach((look: any) => {
                const ids = [
                    ...(look.items || []),
                    ...(look.layout?.map((i: any) => i.itemId) || []),
                ]

                ids.forEach((id: string) => {
                    if (!id) return
                    countMap[id] = (countMap[id] || 0) + 1
                })
            })
        })

        const enriched = items.map((i: any) => ({
            ...i,
            count: countMap[i.id] || 0,
        }))

        // 🔥 HEALTH SCORE
        const used = enriched.filter(i => i.count > 0).length
        setHealthScore(Math.round((used / enriched.length) * 100))

        setFavorite(enriched.filter(i => i.count > 0).sort((a, b) => b.count - a.count))
        setLosing(enriched.filter(i => i.count === 0))
    }

    function toggleFilter(cat: string) {
        if (cat === "All") {
            setFilters([])
            return
        }

        setFilters(prev =>
            prev.includes(cat)
                ? prev.filter(c => c !== cat)
                : [...prev, cat]
        )
    }

    function applyFilter(list: any[]) {
        let result = list

        if (filters.length > 0) {
            result = result.filter(i => filters.includes(i.category))
        }

        if (search) {
            result = result.filter(i =>
                i.name.toLowerCase().includes(search.toLowerCase())
            )
        }

        return result
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>

                {/* COVER */}
                <Pressable onPress={() => editing && pickImage(setCoverImg, "cover")}>
                    {coverImg
                        ? <Image source={{ uri: coverImg }} style={styles.cover} />
                        : <View style={styles.cover} />}
                </Pressable>

                {/* PROFILE */}
                <View style={styles.profileRow}>
                    <Pressable onPress={() => editing && pickImage(setProfileImg, "profile")}>
                        {profileImg
                            ? <Image source={{ uri: profileImg }} style={styles.avatar} />
                            : <View style={styles.avatar} />}
                    </Pressable>

                    <View style={{ flex: 1 }}>
                        {editing
                            ? <TextInput value={username} onChangeText={setUsername} style={styles.input} />
                            : <Text style={styles.username}>{username}</Text>}

                        <Text style={styles.sub}>{wardrobe.length} items</Text>
                    </View>

                    <Pressable onPress={() => editing ? saveProfile() : setEditing(true)}>
                        <Ionicons name={editing ? "checkmark" : "create-outline"} size={20} />
                    </Pressable>
                </View>

                {/* STREAK */}
                <View style={{ paddingHorizontal: 16, marginTop: 6 }}>
                    <View style={styles.streakBadge}>
                        <Ionicons name="flame" size={14} color="#C00000" />
                        <Text style={styles.streakText}>{streak} day</Text>
                    </View>
                </View>
                {/* 🔥 NEW: HEALTH */}
                <View style={styles.healthBox}>
                    <View style={styles.healthBar}>
                        <View style={[styles.healthFill, { width: `${healthScore}%` }]} />
                    </View>
                    <Text style={styles.healthText}>{healthScore}% used</Text>
                </View>

                <Section title="Favorite" data={favorite} onAll={() => {
                    setModalData(favorite)
                    setModalVisible(true)
                }} />

                <Section title="Never Used" data={losing} onAll={() => {
                    setModalData(losing)
                    setModalVisible(true)
                }} />

            </ScrollView>

            {/* MODAL */}
            <Modal visible={modalVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1 }}>

                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>All Items</Text>
                        <Pressable onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={26} />
                        </Pressable>
                    </View>

                    {/* 🔥 SEARCH */}
                    <TextInput
                        placeholder="Search item..."
                        value={search}
                        onChangeText={setSearch}
                        style={styles.search}
                    />

                    {/* FILTER */}
                    <ScrollView horizontal style={styles.filterWrap}>
                        {["All", ...new Set(wardrobe.map(i => i.category))].map(c => {
                            const active = c === "All"
                                ? filters.length === 0
                                : filters.includes(c)

                            return (
                                <Pressable
                                    key={c}
                                    onPress={() => toggleFilter(c)}
                                    style={[styles.filter, active && styles.filterActive]}
                                >
                                    <Text style={{ color: active ? "#fff" : "#000", fontFamily: "ProductSans" }}>
                                        {c}
                                    </Text>
                                </Pressable>
                            )
                        })}
                    </ScrollView>

                    {/* GRID */}
                    <ScrollView contentContainerStyle={styles.grid}>
                        {applyFilter(modalData).map((i: any) => (
                            <View key={i.id} style={styles.cardBox}>
                                <Image source={{ uri: i.imageUri }} style={styles.square} />

                                <Text numberOfLines={1} style={styles.name}>
                                    {i.name}
                                </Text>

                                {/* 🔥 DEAD ITEM */}
                                {i.count === 0 && (
                                    <Text style={styles.deadText}>unused</Text>
                                )}

                                {i.count > 0 && (
                                    <View style={styles.pill}>
                                        <Text style={styles.pillText}>{i.count}x</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    )
}

/* ================= SECTION ================= */

function Section({ title, data, onAll }: any) {
    return (
        <View style={{ marginTop: 24 }}>
            <View style={styles.row}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Pressable onPress={onAll}>
                    <Text style={styles.allBtn}>All</Text>
                </Pressable>
            </View>

            <ScrollView horizontal>
                {data.slice(0, 5).map((i: any) => (
                    <View key={i.id} style={styles.cardBoxSmall}>
                        <Image source={{ uri: i.imageUri }} style={styles.squareSmall} />
                        <Text numberOfLines={1} style={styles.name}>{i.name}</Text>
                        {i.count > 0 && (
                            <View style={styles.pill}>
                                <Text style={styles.pillText}>{i.count}x</Text>
                            </View>
                        )}
                    </View>
                ))}
            </ScrollView>
        </View>
    )
}

/* ================= STYLE ================= */

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9F9F9" },

    cover: { height: 140, backgroundColor: "#ddd" },

    profileRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        marginTop: -40,
    },

    avatar: {
        width: 70,
        height: 70,
        borderRadius: 40,
        backgroundColor: "#C00000",
        marginRight: 12,
    },

    username: { fontSize: 25, fontWeight: "600", fontFamily: "ProductSans-Bold" },
    sub: { color: "#777", fontSize: 12, fontFamily: "ProductSans" },

    input: {
        backgroundColor: "#f2f2f2",
        borderRadius: 8,
        padding: 6,
    },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        fontFamily: "ProductSans-Bold",
        paddingBottom: 5
    },

    allBtn: { color: "#C00000", fontFamily: "ProductSans-Bold" },

    cardBoxSmall: {
        width: 130,
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 8,
        margin: 5,
        alignItems: "center",
        shadowColor: "#626262ff",
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },

    squareSmall: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: 10,
    },

    cardBox: {
        width: SIZE,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 8,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 10,
    },

    square: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: 12,
    },

    name: {
        fontSize: 12,
        marginTop: 4,
        fontFamily: "ProductSans",
        alignSelf: "center",
    },

    pill: {
        marginTop: 6,
        alignSelf: "center",
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#C00000",
        backgroundColor: "#C00000",
    },

    pillText: {
        fontSize: 11,
        color: "#fff",
        fontFamily: "ProductSans-Bold",
    },

    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 16,
    },

    modalTitle: { fontSize: 22, fontWeight: "600", fontFamily: "ProductSans-Bold" },

    filterWrap: { paddingHorizontal: 10, paddingBottom: 13 },

    filter: {
        height: 32,
        paddingHorizontal: 14,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 999,
        backgroundColor: "#eee",
        marginRight: 8,
    },

    filterActive: { backgroundColor: "#C00000" },

    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        gap: 10,
        paddingHorizontal: 4,
        paddingBottom: 30,
        paddingTop: 20,
        paddingLeft: 15,
        paddingRight: 10,
    },

    streakBox: {
        paddingHorizontal: 16,
        paddingLeft: 16,
        marginTop: 6,
    },

    streakText: {
        fontFamily: "ProductSans-Bold",
        color: "#C00000",
    },

    healthBox: {
        paddingHorizontal: 16,
        marginTop: 10,
    },

    healthBar: {
        height: 6,
        backgroundColor: "#eee",
        borderRadius: 10,
        overflow: "hidden",
    },

    healthFill: {
        height: 6,
        backgroundColor: "#C00000",
    },

    healthText: {
        marginTop: 4,
        fontSize: 11,
        color: "#777",
        fontFamily: "ProductSans",
    },

    search: {
        marginHorizontal: 16,
        marginBottom: 10,
        backgroundColor: "#f2f2f2",
        borderRadius: 10,
        padding: 10,
        fontFamily: "ProductSans",
    },

    deadText: {
        fontSize: 10,
        color: "#999",
        marginTop: 4,
        fontFamily: "ProductSans",
        alignSelf: "center",
    },
    streakBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",

        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        paddingLeft: 10,
        borderRadius: 999,
        backgroundColor: "#FFF0F0",
        borderWidth: 1,
        borderColor: "#FFD6D6",
    },
})