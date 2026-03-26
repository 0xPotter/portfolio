import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

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
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged };
