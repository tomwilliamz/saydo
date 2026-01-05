import admin from 'firebase-admin'

// Initialize Firebase Admin (singleton)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Private key needs newlines converted
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export const messaging = admin.messaging()

export async function sendPushNotification(
  fcmTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (fcmTokens.length === 0) return

  const message = {
    notification: {
      title,
      body,
    },
    data: data || {},
    tokens: fcmTokens,
    android: {
      priority: 'high' as const,
      notification: {
        channelId: 'alerts',
        priority: 'high' as const,
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    },
    webpush: {
      notification: {
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
      },
      fcmOptions: {
        link: '/',
      },
    },
  }

  try {
    const response = await messaging.sendEachForMulticast(message)
    console.log('FCM send result:', response.successCount, 'success,', response.failureCount, 'failures')

    // Log any failures for debugging
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error('Failed to send to token:', fcmTokens[idx], resp.error?.message)
        }
      })
    }
  } catch (error) {
    console.error('FCM send error:', error)
  }
}
