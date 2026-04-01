import React from 'react'
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useFonts } from 'expo-font'

const { width } = Dimensions.get('window')
const GAP = 12
const CARD_SIZE = (width - 60 - GAP) / 2

export default function StylingScreen() {
    const router = useRouter()

    const [fontsLoaded] = useFonts({
        ProductSans: require('../../../assets/fonts/ProductSans-Regular.ttf'),
        'ProductSans-Bold': require('../../../assets/fonts/ProductSans-Bold.ttf'),
    })

    if (!fontsLoaded) return null

    const items = [
        {
            title: 'AI Mix & Match',
            icon: 'sparkles', // 😏 wink vibe
            route: '/mixmatch' as const,
            highlight: true,
        },
        {
            title: 'Stack Styling',
            icon: 'layers-outline',
            route: '/stackstyle' as const,
        },
        {
            title: 'Canvas',
            icon: 'grid-outline',
            route: '/calendar/add' as const,
        },
    ]

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <Text style={styles.header}>Styling</Text>

            {/* GRID */}
            <View style={styles.grid}>
                {items.map((item, index) => (
                    <Pressable
                        key={index}
                        style={({ pressed }) => [
                            styles.card,
                            item.highlight && styles.cardHighlight,
                            index % 2 === 1 && { marginRight: 0 }, // ⭐ ช่องขวาไม่ต้องมี margin
                            pressed && { transform: [{ scale: 0.96 }] },
                        ]}
                        onPress={() => router.push(item.route)}
                    >
                        {/* ICON */}
                        <View
                            style={[
                                styles.iconCircle,
                                item.highlight && { backgroundColor: '#ffffff20' }, // โปร่งๆ
                            ]}
                        >
                            <Ionicons
                                name={item.icon as any}
                                size={26}
                                color={item.highlight ? '#fff' : '#C00000'}
                            />
                        </View>

                        {/* TEXT */}
                        <Text
                            style={[
                                styles.cardText,
                                item.highlight && { color: '#fff' },
                            ]}
                        >
                            {item.title}
                        </Text>

                        {/* AI BADGE */}
                        {item.highlight && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>AI</Text>
                            </View>
                        )}
                    </Pressable>
                ))}
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
        paddingHorizontal: 30,
    },

    header: {
        fontFamily: 'ProductSans-Bold',
        fontSize: 22,
        color: '#000',
        marginTop: 10,
        marginBottom: 16,
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },

    card: {
        width: CARD_SIZE,
        aspectRatio: 1,
        backgroundColor: '#fff',
        borderRadius: 24,
        marginBottom: 16,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',

        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },

    cardHighlight: {
        backgroundColor: '#C00000',
    },

    iconCircle: {
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 999,
        marginBottom: 10,
    },

    cardText: {
        fontFamily: 'ProductSans-Bold',
        fontSize: 14,
        color: '#000',
        textAlign: 'center',
    },

    badge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#fff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },

    badgeText: {
        fontSize: 10,
        fontFamily: 'ProductSans-Bold',
        color: '#C00000',
    },
})