import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAXXnf9FfM6o8tmFwV8JyzTxnh0U6lqTV8",
  authDomain: "portfolio-e7720.firebaseapp.com",
  projectId: "portfolio-e7720",
  storageBucket: "portfolio-e7720.firebasestorage.app",
  messagingSenderId: "143167511531",
  appId: "1:143167511531:web:adba62f080f31442aad7ae"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

export { app, auth, db, storage, provider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, ref, uploadBytes, getDownloadURL };
