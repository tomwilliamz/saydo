import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase (singleton)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Get messaging instance (only in browser)
let messagingInstance: Messaging | null = null

export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator)) return null
  if (!messagingInstance) {
    try {
      messagingInstance = getMessaging(app)
    } catch (error) {
      console.error('Failed to initialize Firebase Messaging:', error)
      return null
    }
  }
  return messagingInstance
}

export async function requestNotificationPermission(): Promise<string | null> {
  const messaging = getFirebaseMessaging()
  if (!messaging) return null

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    // Get FCM token using the VAPID key
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    })

    return token
  } catch (error) {
    console.error('Failed to get notification permission:', error)
    return null
  }
}

export { onMessage }
