import {
  initializeApp,
  getApps,
  getApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAYu2CdDp6P4qd8gamhHAeq0fE-i5xT-bA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gridguardsolarmonitoring.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://gridguardsolarmonitoring-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gridguardsolarmonitoring",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gridguardsolarmonitoring.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "638259056157",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:638259056157:web:d6b15d9d8ec87eb78880f4",
};

export const isFirebaseConfigured = true;

const firebaseApp: FirebaseApp = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig);

export const app: FirebaseApp = firebaseApp;
export const auth: Auth = getAuth(firebaseApp);
export const rtdb: Database = getDatabase(firebaseApp, firebaseConfig.databaseURL);
export const db: Firestore = getFirestore(firebaseApp);
export const databaseURL = firebaseConfig.databaseURL;
