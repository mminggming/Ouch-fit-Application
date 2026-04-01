// api.js
const API_URL = 'http://localhost:5119/api/';  // URL ของ API ที่คุณสร้าง

// ฟังก์ชันดึงข้อมูลจาก API
export const getMessage = async () => {
  try {
    const response = await fetch(`${API_URL}ouchfit`);  // ใช้ fetch แทน axios
    
    // เช็คสถานะของ response ถ้าไม่สำเร็จให้ throw error
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();  // แปลง response เป็น JSON
    return data;  // คืนค่าข้อมูลที่ได้จาก API
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};
