import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getMessage } from './api';  // นำเข้าฟังก์ชัน getMessage จาก api.js

const App = () => {
  const [message, setMessage] = useState('');

  // ใช้ useEffect เพื่อดึงข้อมูลจาก API เมื่อแอปเริ่มต้น
  useEffect(() => {
    const fetchData = async () => {
      const data = await getMessage();  // เรียกใช้ getMessage จาก api.js
      setMessage(data.message);  // ตั้งค่าข้อมูลที่ได้รับจาก API
    };

    fetchData();
  }, []);  // empty dependency array หมายถึงจะเรียกแค่ครั้งเดียวตอนเริ่มต้น

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message ? message : 'Loading...'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
  },
});

export default App;
