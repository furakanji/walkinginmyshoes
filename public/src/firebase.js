import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  projectId: "walkinginmyshoes-e3fcd",
  appId: "1:957046610945:web:677f87728dd780c671b400",
  storageBucket: "walkinginmyshoes-e3fcd.firebasestorage.app",
  apiKey: "AIzaSyCJ0PwtzfPBWK1SOIsM803HF4uuAe7TIDQ",
  authDomain: "walkinginmyshoes-e3fcd.firebaseapp.com",
  messagingSenderId: "957046610945",
  measurementId: "G-C0F45697KT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, signInAnonymously, onAuthStateChanged, collection, addDoc, serverTimestamp };
