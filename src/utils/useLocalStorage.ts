// src/utils/useLocalStorage.ts
import { useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : initialValue;
  });
  function set(v: T) {
    setState(v);
    localStorage.setItem(key, JSON.stringify(v));
  }
  return [state, set] as const;
}


/*
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC47m2tHObRrVKCZy3cm1LAJgDA_X2c6UA",
  authDomain: "apptitude-react.firebaseapp.com",
  projectId: "apptitude-react",
  storageBucket: "apptitude-react.firebasestorage.app",
  messagingSenderId: "604506867603",
  appId: "1:604506867603:web:fb29f3f41987cd0ceb4a66",
  measurementId: "G-LYJZ80JDLF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
*/