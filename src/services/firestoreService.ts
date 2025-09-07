// src/services/firestoreService.ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth, ensureAnonymousAuth } from "../firebase";

export async function saveAttemptToFirestore(data: {
  storageKey: string;
  name?: string;
  phone?: string;
  grade?: number;
  categoryScores?: Record<string, number>;
}) {
  try {
    // ensure authentication exists before write
    if (!auth.currentUser) {
      console.log("No auth.currentUser before write — attempting ensureAnonymousAuth()");
      try {
        await ensureAnonymousAuth();
      } catch (e) {
        console.warn("ensureAnonymousAuth failed (write will likely be denied)", e);
        // let the write still attempt (or you can return early) — here we continue to try
      }
    } else {
      console.log("auth.currentUser present before write:", auth.currentUser.uid);
    }

    const docRef = await addDoc(collection(db, "attempts"), {
      storageKey: data.storageKey,
      name: data.name ?? null,
      phone: data.phone ?? null,
      grade: data.grade ?? null,
      categoryScores: data.categoryScores ?? null,
      createdAt: serverTimestamp()
    });

    console.log("Firestore write succeeded, id:", docRef.id);
    return { id: docRef.id };
  } catch (err: any) {
    console.error("Firestore save failed", {
      name: err?.name,
      code: err?.code,
      message: err?.message
    });
    throw err;
  }
}
