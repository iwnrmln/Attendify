// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDi1aEuHSM5oysBj_84mcj8e7NywLnU6fw",
  authDomain: "attendify-74660.firebaseapp.com",
  projectId: "attendify-74660",
  storageBucket: "attendify-74660.firebasestorage.app",
  messagingSenderId: "1089077592493",
  appId: "1:1089077592493:web:851b2ce95ee3f443e52124",
  measurementId: "G-CMHN36DEPE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence (keeps user logged in)
const auth = getAuth(app);

export { auth };