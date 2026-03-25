import { env } from '../config/env';

export const firebaseConfig = {
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// export const firebaseConfig = {
//   apiKey: "AIzaSyDON1hOAarZv-d0ckI7OCMG2JJYHC9bvtI",
//   authDomain: "hashmi-vip-numbers.firebaseapp.com",
//   projectId: "hashmi-vip-numbers",
//   storageBucket: "hashmi-vip-numbers.firebasestorage.app",
//   messagingSenderId: "501716649750",
//   appId: "1:501716649750:web:709b57cc930fa6bb84f237",
//   measurementId: "G-KQE43JR8WE"
// };