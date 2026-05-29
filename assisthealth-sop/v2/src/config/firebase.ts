import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCTkJx4GWitLqPXgCXli4VYr8keK97gEB4",
  authDomain: "assisthealth-sop.firebaseapp.com",
  projectId: "assisthealth-sop",
  storageBucket: "assisthealth-sop.firebasestorage.app",
  messagingSenderId: "571279363026",
  appId: "1:571279363026:web:70df31a8b6a9479a76560b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
