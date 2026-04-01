// app/config/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDtgV_qcoQbYHIvFsNfGRORD7Uo1dKzICg",
  authDomain: "ouchfitapp-f55f0.firebaseapp.com",
  projectId: "ouchfitapp-f55f0",
  storageBucket: "ouchfitapp-f55f0.firebasestorage.app",
  messagingSenderId: "693876921525",
  appId: "1:693876921525:web:bd747ae07277c385741afc",
  measurementId: "G-6GTX2TETF3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
