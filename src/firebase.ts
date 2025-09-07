// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// quick runtime sanity log (avoid printing API key in public logs if you share them)
console.log("Firebase runtime config:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKeySet: !!firebaseConfig.apiKey
});

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * Ensure there's an authenticated user (anonymous). Call early in app lifecycle.
 */
export async function ensureAnonymousAuth() {
  try {
    if (!auth.currentUser) {
      console.log("No auth.currentUser — signing in anonymously...");
      const cred = await signInAnonymously(auth);
      console.log("Anonymous sign-in success:", {
        uid: cred.user?.uid,
        isAnonymous: cred.user?.isAnonymous
      });
    } else {
      console.log("Already signed in:", {
        uid: auth.currentUser.uid,
        isAnonymous: auth.currentUser.isAnonymous
      });
    }
  } catch (err) {
    console.warn("Anonymous auth failed:", err);
    // rethrow so callers know it failed if they need to
    throw err;
  }
}
