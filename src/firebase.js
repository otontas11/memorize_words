import { getAnalytics } from 'firebase/analytics'
import { getApps, getApp, initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAvhY1iaGb7-4FQgMjqLP_b8KNTVTq8gIc',
  authDomain: 'memorize-words-c2ea6.firebaseapp.com',
  projectId: 'memorize-words-c2ea6',
  storageBucket: 'memorize-words-c2ea6.firebasestorage.app',
  messagingSenderId: '1079742963177',
  appId: '1:1079742963177:web:f25ddc295d408d572b7f78',
  measurementId: 'G-V5KGB6GF09',
}

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

export let analytics = null
try {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (!offline) analytics = getAnalytics(firebaseApp)
} catch {
  analytics = null
}

export const db = getFirestore(firebaseApp)
