export { initializeApp } from "firebase/app";
export { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, sendPasswordResetEmail,
  connectAuthEmulator } from "firebase/auth";
export { getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit,
  serverTimestamp, connectFirestoreEmulator } from "firebase/firestore";
export { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
