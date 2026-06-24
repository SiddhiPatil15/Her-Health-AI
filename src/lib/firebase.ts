import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword as realSignIn, 
  createUserWithEmailAndPassword as realCreateUser,
  signOut as realSignOut,
  onAuthStateChanged as realOnAuthChange,
  updateProfile as realUpdateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  doc as realDoc, 
  getDoc as realGetDoc, 
  setDoc as realSetDoc, 
  onSnapshot as realOnSnapshot,
  collection as realCollection,
  addDoc as realAddDoc,
  query as realQuery,
  orderBy as realOrderBy,
  limit as realLimit,
  getDocs as realGetDocs,
  deleteDoc as realDeleteDoc
} from "firebase/firestore";

// Check if user has configured custom keys in .env
// We treat it as configured only if VITE_FIREBASE_API_KEY is defined and is not the placeholder
export const hasCustomKeys = !!import.meta.env.VITE_FIREBASE_API_KEY && 
                             import.meta.env.VITE_FIREBASE_API_KEY !== 'your_api_key_here';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCzs099gzT3rwBBIbrRdA6coc9C2ucyvPY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "herhealthai-fe779.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "herhealthai-fe779",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "herhealthai-fe779.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "80616597236",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:80616597236:web:93133ef71cbc4c9a9320a1",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-EQSFTB1908"
};

const app = hasCustomKeys ? initializeApp(firebaseConfig) : null;
export const auth = hasCustomKeys ? getAuth(app) : { currentUser: null } as any;
export const db = hasCustomKeys ? getFirestore(app) : {} as any;

// Mock Store helpers
const getMockData = (key: string) => {
  const data = localStorage.getItem(`mock_db_${key}`);
  return data ? JSON.parse(data) : null;
};
const setMockData = (key: string, val: any) => {
  localStorage.setItem(`mock_db_${key}`, JSON.stringify(val));
};

// Auth State Listeners
const authListeners: Array<(user: any) => void> = [];
const triggerAuthChange = (user: any) => {
  if (!hasCustomKeys) {
    auth.currentUser = user;
  }
  authListeners.forEach(cb => cb(user));
};

// Initialize current user from localStorage if in mock mode
if (!hasCustomKeys) {
  const saved = localStorage.getItem("mock_current_user");
  if (saved) {
    auth.currentUser = JSON.parse(saved);
  }
}

// Wrapped Auth exports
export const signInWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
  if (hasCustomKeys) {
    return realSignIn(authInstance, email, pass);
  }
  const users = getMockData("users_credentials") || {};
  if (!users[email] || users[email].password !== pass) {
    throw new Error("Firebase: Error (auth/invalid-credential).");
  }
  const user = { uid: users[email].uid, email, displayName: users[email].displayName };
  localStorage.setItem("mock_current_user", JSON.stringify(user));
  triggerAuthChange(user);
  return { user };
};

export const createUserWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
  if (hasCustomKeys) {
    return realCreateUser(authInstance, email, pass);
  }
  const users = getMockData("users_credentials") || {};
  if (users[email]) {
    throw new Error("Firebase: Error (auth/email-already-in-use).");
  }
  const uid = "mock_uid_" + Math.random().toString(36).substr(2, 9);
  users[email] = { uid, password: pass, displayName: "" };
  setMockData("users_credentials", users);
  
  const user = { uid, email, displayName: "" };
  localStorage.setItem("mock_current_user", JSON.stringify(user));
  triggerAuthChange(user);
  return { user };
};

export const signOut = async (authInstance: any) => {
  if (hasCustomKeys) {
    return realSignOut(authInstance);
  }
  localStorage.removeItem("mock_current_user");
  triggerAuthChange(null);
};

export const onAuthStateChanged = (authInstance: any, callback: (user: any) => void) => {
  if (hasCustomKeys) {
    return realOnAuthChange(authInstance, callback);
  }
  authListeners.push(callback);
  callback(auth.currentUser);
  return () => {
    const idx = authListeners.indexOf(callback);
    if (idx > -1) authListeners.splice(idx, 1);
  };
};

export const updateProfile = async (userInstance: any, profile: { displayName?: string }) => {
  if (hasCustomKeys) {
    return realUpdateProfile(userInstance, profile);
  }
  if (auth.currentUser) {
    const updated = { ...auth.currentUser, displayName: profile.displayName || "" };
    localStorage.setItem("mock_current_user", JSON.stringify(updated));
    
    // update credentials db
    const users = getMockData("users_credentials") || {};
    const email = Object.keys(users).find(k => users[k].uid === updated.uid);
    if (email) {
      users[email].displayName = profile.displayName || "";
      setMockData("users_credentials", users);
    }
    
    triggerAuthChange(updated);
  }
};

// Wrapped Firestore exports
export const doc = (dbInstance: any, path: string, ...segments: string[]) => {
  if (hasCustomKeys) {
    return realDoc(dbInstance, path, ...segments);
  }
  return { path: [path, ...segments].join("/") };
};

export const getDoc = async (docRef: any) => {
  if (hasCustomKeys) {
    return realGetDoc(docRef);
  }
  const data = getMockData(docRef.path);
  return {
    exists: () => data !== null,
    data: () => data
  };
};

export const setDoc = async (docRef: any, data: any, options?: { merge?: boolean }) => {
  if (hasCustomKeys) {
    return realSetDoc(docRef, data, options);
  }
  let finalData = data;
  if (options?.merge) {
    const existing = getMockData(docRef.path) || {};
    finalData = { ...existing, ...data };
  }
  setMockData(docRef.path, finalData);
};

export const onSnapshot = (docRef: any, callback: (snapshot: any) => void) => {
  if (hasCustomKeys) {
    return realOnSnapshot(docRef, callback);
  }
  const data = getMockData(docRef.path);
  callback({
    exists: () => data !== null,
    data: () => data
  });
  return () => {}; // no-op unsubscribe
};

export const collection = (dbInstance: any, path: string, ...segments: string[]) => {
  if (hasCustomKeys) {
    return realCollection(dbInstance, path, ...segments);
  }
  return { path: [path, ...segments].join("/") };
};

export const addDoc = async (collRef: any, data: any) => {
  if (hasCustomKeys) {
    return realAddDoc(collRef, data);
  }
  const id = "mock_doc_" + Math.random().toString(36).substr(2, 9);
  setMockData(`${collRef.path}/${id}`, data);
  return { id };
};

export const query = (ref: any, ...queryConstraints: any[]) => {
  if (hasCustomKeys) {
    return realQuery(ref, ...queryConstraints);
  }
  return { path: ref.path, constraints: queryConstraints };
};

export const orderBy = (field: string, direction: "asc" | "desc" = "asc") => {
  if (hasCustomKeys) {
    return realOrderBy(field, direction);
  }
  return { type: "orderBy", field, direction };
};

export const limit = (num: number) => {
  if (hasCustomKeys) {
    return realLimit(num);
  }
  return { type: "limit", limit: num };
};

export const getDocs = async (queryOrRef: any) => {
  if (hasCustomKeys) {
    return realGetDocs(queryOrRef);
  }
  const path = queryOrRef.path;
  const constraints = queryOrRef.constraints || [];
  
  const prefix = `mock_db_${path}/`;
  const docsList: any[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const docId = key.substring(prefix.length);
      // Skip sub-collections (check if there is another slash)
      if (!docId.includes("/")) {
        const val = localStorage.getItem(key);
        if (val) {
          docsList.push({
            id: docId,
            ...JSON.parse(val)
          });
        }
      }
    }
  }

  // Apply sorting
  let sortedDocs = [...docsList];
  const orderByConstraint = constraints.find((c: any) => c.type === "orderBy");
  if (orderByConstraint) {
    const { field, direction } = orderByConstraint;
    sortedDocs.sort((a, b) => {
      const valA = a[field];
      const valB = b[field];
      if (valA === undefined || valB === undefined) return 0;
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  // Apply limit
  const limitConstraint = constraints.find((c: any) => c.type === "limit");
  if (limitConstraint) {
    sortedDocs = sortedDocs.slice(0, limitConstraint.limit);
  }

  return {
    docs: sortedDocs.map(d => {
      const { id, ...data } = d;
      return {
        id,
        data: () => data
      };
    })
  };
};

export const deleteDoc = async (docRef: any) => {
  if (hasCustomKeys) {
    return realDeleteDoc(docRef);
  }
  localStorage.removeItem(`mock_db_${docRef.path}`);
};

export default app;
