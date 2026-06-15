const admin = require("firebase-admin");

const initFirebase = () => {
  try {
    const projectId   = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey  = process.env.FIREBASE_PRIVATE_KEY;

    // If Firebase vars are missing, warn but don't crash.
    // Auth routes will return 503 until vars are added in Railway.
    if (!projectId || !clientEmail || !privateKey) {
      console.warn("⚠️  Firebase env vars not set. Auth routes will be unavailable.");
      console.warn("   Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY to Railway.");
      return;
    }

    const serviceAccount = {
      type: "service_account",
      project_id: projectId,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "",
      // Railway sometimes double-escapes \n — this handles both cases
      private_key: privateKey.includes("\\n")
        ? privateKey.replace(/\\n/g, "\n")
        : privateKey,
      client_email: clientEmail,
      client_id: process.env.FIREBASE_CLIENT_ID || "",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
    };

    // Prevent re-initialization on hot reload
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    console.log("✅ Firebase Admin SDK initialized");
  } catch (error) {
    console.error("❌ Firebase initialization error:", error.message);
    // Don't call process.exit() — let other routes still work
  }
};

const getFirebaseAdmin = () => admin;

module.exports = { initFirebase, getFirebaseAdmin };
