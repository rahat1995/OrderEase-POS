
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from "firebase/storage";
// Removed: import { getAuth, type Auth } from "firebase/auth"; 

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
    "Ensure this key is correctly set in your '.env.local' file and that you RESTART your dev server after changes.",
    "------------------------------------------------------------------------------------",
    "TROUBLESHOOTING STEPS:",
    "1. Ensure you have a '.env.local' file in the ROOT of your project directory.",
    "2. In '.env.local', make sure NEXT_PUBLIC_FIREBASE_API_KEY is set to your ACTUAL API key.",
    "   Example: NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "3. Find your API key in: Firebase Console -> Project settings (gear icon ⚙️) -> General tab -> Your apps -> SDK setup and configuration.",
    "4. After editing and SAVING '.env.local', you MUST RESTART your Next.js development server (stop 'npm run dev' and run it again).",
    "------------------------------------------------------------------------------------",
    `Current value loaded for NEXT_PUBLIC_FIREBASE_API_KEY (length: ${apiKey?.length}): '${apiKey?.substring(0, 5)}...'`,
    "If this value is 'undefined', a placeholder, or not your actual key, Firebase will fail.",
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  ].join("\n");
  console.error("\n\n" + errorMessage + "\n\n");
}


let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
// Removed: const auth: Auth = getAuth(app); 

export { app, db, storage }; // Removed auth from export
