// src/lib/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDLMpfKUWavlaXlLxHV52N6xA6_VoYgxX4",
  authDomain: "travel-app-255a9.firebaseapp.com",
  projectId: "travel-app-255a9",
  storageBucket: "travel-app-255a9.firebasestorage.app",
  messagingSenderId: "631028535459",
  appId: "1:631028535459:web:be020b99193b0290132f16"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
