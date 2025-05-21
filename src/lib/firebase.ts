
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

// CRITICAL CHECK FOR API KEY
const apiKey = firebaseConfig.apiKey;
const isApiKeyMissingOrPlaceholder = !apiKey || apiKey.startsWith("your_") || apiKey.startsWith("AIzaSyYOUR_") || apiKey.length < 10;

if (isApiKeyMissingOrPlaceholder) {
  const errorMessage = [
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
    "CRITICAL FIREBASE CONFIGURATION ERROR:",
    "Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is MISSING, a PLACEHOLDER, or INVALID.",
    "Your application WILL NOT be able to connect to Firebase services.",
    "------------------------------------------------------------------------------------",
    "TROUBLESHOOTING STEPS:",
    "1. Ensure you have a '.env.local' file in the ROOT of your project directory.",
    "2. In '.env.local', make sure NEXT_PUBLIC_FIREBASE_API_KEY is set to your ACTUAL API key.",
    "   Example: NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "3. Find your API key in: Firebase Console -> Project settings (gear icon ⚙️) -> General tab -> Your apps -> SDK setup and configuration.",
    "4. After editing and SAVING '.env.local', you MUST RESTART your Next.js development server (stop 'npm run dev' and run it again).",
    "------------------------------------------------------------------------------------",
    `Current value loaded for NEXT_PUBLIC_FIREBASE_API_KEY: '${apiKey}'`,
    apiKey && apiKey.length > 5 ? `   (Starts with: '${apiKey.substring(0, 5)}')` : "   (Value appears to be missing or very short!)",
    "If this value is 'undefined', a placeholder, or not your actual key, Firebase will fail.",
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  ].join("\n");
  console.error("\n\n" + errorMessage + "\n\n");
  // Optionally, in a real app, you might throw an error here or prevent app initialization
  // throw new Error("Firebase API Key is not configured correctly. Halting application. Please check server console and .env.local.");
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
// The line below is where the 'auth/invalid-api-key' error often originates if the API key is wrong
const auth: Auth = getAuth(app); // Initialize Firebase Auth. This call will fail if API key is invalid.

export { app, db, storage, auth }; // Export auth
