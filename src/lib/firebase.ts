import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCEQFeL_z-uBEjHKPp00Yuqo85ZOZxfcus",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "health-drift-ai.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "health-drift-ai",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "health-drift-ai.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "486925716486",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:486925716486:web:2ecfb81205a02495d0c787",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FYHTCWE3S9",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
