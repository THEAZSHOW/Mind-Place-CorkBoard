import { initializeApp } from "firebase/app";
import { initializeAuth, GoogleAuthProvider, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAsSd5RUAFWUFLkmqjHCpSp1D0HUuPeM0A",
  authDomain: "mycorkboard-dcc27.firebaseapp.com",
  projectId: "mycorkboard-dcc27",
  storageBucket: "mycorkboard-dcc27.firebasestorage.app",
  messagingSenderId: "65388627169",
  appId: "1:65388627169:web:0354e29546e58ae10263a0",
  measurementId: "G-WDLZYM4BF0"
};

const app = initializeApp(firebaseConfig);

// Using initializeAuth with browserLocalPersistence is the modern, correct way 
// to set up Firebase Authentication. It configures session persistence from the start,
// preventing race conditions that can cause users to be logged out on page refresh.
// This ensures that the user's login state is reliably maintained across sessions.
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence
});

export const googleProvider = new GoogleAuthProvider();