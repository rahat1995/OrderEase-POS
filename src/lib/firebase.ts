
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAuth, type Auth } from "firebase/auth"; // Import Firebase Auth

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if the API key is present and not a placeholder
// This log will appear in the terminal where `npm run dev` is running.
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "your_api_key" || firebaseConfig.apiKey === "your_api_key_here" || firebaseConfig.apiKey.length < 10) { // Added a basic length check
  console.error(
    "\n\n" +
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
    "Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is MISSING, a PLACEHOLDER, or INVALID.\n" +
    "Please ensure it is correctly set in your .env.local file.\n" +
    "You can find your API key in your Firebase project settings.\n" +
    "After updating .env.local, you MUST restart your Next.js development server (npm run dev).\n" +
    "Current value for apiKey being used is: '" + firebaseConfig.apiKey + "'\n" +
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n"
  );
}


let app: FirebaseApp;
// CRITICAL: Ensure firebaseConfig.apiKey is valid before calling initializeApp.
// The error "auth/invalid-api-key" means Firebase Authentication service
// rejected the API key used during initialization or when getAuth() is called.
if (getApps().length === 0) {
  // Important: Ensure firebaseConfig.apiKey is valid BEFORE this call.
  // If it's invalid, initializeApp might succeed, but subsequent calls like getAuth() will fail.
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const auth: Auth = getAuth(app); // Initialize Firebase Auth. This call will fail if API key is invalid.

export { app, db, storage, auth }; // Export auth
