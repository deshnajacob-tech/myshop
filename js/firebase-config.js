/* ============================================================
   Friends Trading Centre — Firebase settings
   ------------------------------------------------------------
   Paste your own project's config below (Firebase console →
   Project settings → Your apps → Web app → SDK setup: Config).
   Until you do, the site shows a friendly "set me up" message.

   These values are NOT secrets — they are meant to be public and
   are visible to anyone who views the page source. What keeps the
   data safe is the Firestore security rules (see firestore.rules).
   ============================================================ */

export const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID",
};

// True once the placeholders above have been replaced with real values.
export const CONFIG_OK = !Object.values(firebaseConfig).some((v) => String(v).includes("PASTE_"));
