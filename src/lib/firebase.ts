import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mock-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mock-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mock-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "mock-sender",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "mock-app",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "mock-measurement"
};

// Check if we are running with mock credentials
export const isMockFirebase = firebaseConfig.apiKey === "mock-key";

let app = undefined as unknown as FirebaseApp;
let auth = undefined as unknown as Auth;
let db = undefined as unknown as Firestore;
let storage = undefined as unknown as FirebaseStorage;
let analytics: any = undefined;

if (typeof window !== 'undefined') {
  // Only initialize on the client side to avoid SSR issues if relying on window
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
      isSupported().then(yes => {
        if (yes) {
          analytics = getAnalytics(app);
        }
      });
    });
  } catch (error) {
    console.error("Firebase initialization error", error);
  }
}

export { app, auth, db, storage, analytics };
