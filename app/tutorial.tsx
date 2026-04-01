import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const TUTORIALS = [
  {
    title: 'เพิ่มเสื้อผ้าเข้าตู้',
    images: [
      require('../assets/images/tutorial/add/1.png'),
      require('../assets/images/tutorial/add/2.png'),
      require('../assets/images/tutorial/add/3.png'),
      require('../assets/images/tutorial/add/4.png'),
    ],
  },
  {
    title: 'แก้ไข / ลบเสื้อผ้า',
    images: [
      require('../assets/images/tutorial/edit/1.png'),
      require('../assets/images/tutorial/edit/2.png'),
      require('../assets/images/tutorial/edit/3.png'),
    ],
  },
  {
    title: 'สร้าง /เพิ่มเสื้อผ้าเข้า Packing',
    images: [
      require('../assets/images/tutorial/packing/1.png'),
      require('../assets/images/tutorial/packing/2.png'),
      require('../assets/images/tutorial/packing/3.png'),
      require('../assets/images/tutorial/packing/4.png'),
      require('../assets/images/tutorial/packing/5.png'),
    ],
  },
  {
    title: 'ดูภาพรวมตู้เสื้อผ้า',
    images: [
      require('../assets/images/tutorial/overview/1.png'),
      require('../assets/images/tutorial/overview/2.png'),
      require('../assets/images/tutorial/overview/3.png'),
    ],
  },
  {
    title: 'Mix & Match เสื้อผ้า',
    images: [
      require('../assets/images/tutorial/mixmatch/1.png'),
      require('../assets/images/tutorial/mixmatch/2.png'),
    ],
  },
  {
    title: 'ค้นหาเสื้อผ้า',
    images: [
      require('../assets/images/tutorial/search/1.png'),
    ],
  },
  {
    title: 'วางแผนการแต่งตัวล่วงหน้า',
    images: [
      require('../assets/images/tutorial/planner/1.png'),
      require('../assets/images/tutorial/planner/2.png'),
      
    ],
  },
  {
    title: 'Save Preset Look',
    images: [
      require('../assets/images/tutorial/preset/1.png'),
      require('../assets/images/tutorial/preset/2.png'),
      require('../assets/images/tutorial/preset/3.png'),
    ],
  },
  {
    title: 'แก้ไข Username',
    images: [
      require('../assets/images/tutorial/profile/1.png'),
      require('../assets/images/tutorial/profile/2.png'),
    ],
  },
];


export default function TutorialScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* ===== HEADER (เหมือน Packing list Album) ===== */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#C00000" />
        </Pressable>

        <Text style={styles.title}>Ouch! FitApp Tutorial</Text>

        {/* spacer ให้ title อยู่กลางจริง */}
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* <Text style={styles.pageTitle}>Ouch! FitApp Tutorial</Text> */}

        {TUTORIALS.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <View key={index} style={styles.card}>
              {/* CARD HEADER */}
              <Pressable
                style={styles.cardHeader}
                onPress={() => setOpenIndex(isOpen ? null : index)}
              >
                <Text style={styles.cardTitle}>
                  {index + 1}. {item.title}
                </Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#000"
                />
              </Pressable>

              {/* DROPDOWN CONTENT */}
              {isOpen && item.images.length > 0 && (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.imageScroll}
  >
    {item.images.map((img, i) => (
      <Image
        key={i}
        source={img}
        style={styles.tutorialImage}
        resizeMode="cover"
      />
    ))}
  </ScrollView>
)}

            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 24,
  },

  /* ===== Header style (เหมือน Packing) ===== */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },

  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginVertical: 16,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  imageScroll: {
    paddingLeft: 16,
    paddingBottom: 16,
  },

  tutorialImage: {
  width: 277,
  height: 602,
  borderRadius: 16,
  marginRight: 12,
  backgroundColor: '#EEE',
},
});
