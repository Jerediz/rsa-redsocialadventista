require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// In Render/Railway, you will set the environment variable FIREBASE_SERVICE_ACCOUNT
// which should be the JSON string of your Firebase service account key.
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountKey) {
  console.error("FIREBASE_SERVICE_ACCOUNT environment variable is not set.");
  // For local testing, you could fallback to a local file, but never commit it to git.
  // const serviceAccount = require('./service-account.json');
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountKey);
} catch (e) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON. Make sure it's a valid JSON string.");
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase Admin initialized successfully with cert.");
} else {
  admin.initializeApp();
  console.log("Firebase Admin initialized successfully with default credentials.");
}

// Middleware to check for a simple API key to protect your endpoint
const authenticateRequest = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.API_KEY || 'rsa-secure-api-key-2026';
  
  if (apiKey !== expectedApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.post('/send-notification', authenticateRequest, async (req, res) => {
  try {
    const { token, title, body, data } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    const message = {
      token: token,
      data: {
        title: title || 'RSA | Comunidad',
        body: body || 'Nueva notificación',
        ...data
      },
      android: {
        priority: 'high',
        collapseKey: data?.collapseKey || 'default',
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            alert: {
              title: title || 'RSA | Comunidad',
              body: body || 'Nueva notificación',
            },
            sound: 'default',
            badge: 1,
            contentAvailable: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`RSA Notification Service is running on port ${PORT}`);
});
