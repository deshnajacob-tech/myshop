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
  apiKey: "AIzaSyB6q3RVN4cVCilqd2R92rDtiJrHoIRp-Kc",
  authDomain: "myshop-2d5ff.firebaseapp.com",
  projectId: "myshop-2d5ff",
  storageBucket: "myshop-2d5ff.firebasestorage.app", // not used — photos live in Firestore
  messagingSenderId: "927960366780",
  appId: "1:927960366780:web:58d54f1e20de96ac925ab9",
};

// True once the placeholders above have been replaced with real values.
export const CONFIG_OK = !Object.values(firebaseConfig).some((v) => String(v).includes("PASTE_"));
