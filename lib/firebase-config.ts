// Public Firebase Web App configuration (safe to embed in the browser and to read on the server).
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyASU2c76_3oHCNfnsChlUWjbgTghy6Y3dk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "falcon-store-360.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "falcon-store-360",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "falcon-store-360.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "663483616684",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:663483616684:web:ed0b619b51fef9d6697e09",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-P1Z90GDP42",
};
