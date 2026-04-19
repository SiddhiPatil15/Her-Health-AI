import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCzs099gzT3rwBBIbrRdA6coc9C2ucyvPY",
  authDomain: "herhealthai-fe779.firebaseapp.com",
  projectId: "herhealthai-fe779",
  storageBucket: "herhealthai-fe779.firebasestorage.app",
  messagingSenderId: "80616597236",
  appId: "1:80616597236:web:93133ef71cbc4c9a9320a1",
  measurementId: "G-EQSFTB1908"
};

const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_api_key_here';

const app = isConfigured ? initializeApp(firebaseConfig) : null as any;
export const auth = isConfigured ? getAuth(app) : null as any;
export const db = isConfigured ? getFirestore(app) : null as any;
export default app;
