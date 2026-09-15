// Firebase Client Integration & Config Provider
// Loads configuration from firebase-applet-config.json
let firebaseConfig = null;
let firebaseApp = null;
let firestoreDb = null;
let firebaseAuth = null;

export async function getFirebaseConfig() {
  if (firebaseConfig) return firebaseConfig;
  try {
    const res = await fetch('/firebase-applet-config.json');
    if (res.ok) {
      firebaseConfig = await res.json();
      return firebaseConfig;
    }
  } catch (err) {
    console.warn('Could not fetch /firebase-applet-config.json:', err);
  }
  return null;
}

export async function initFirebaseClient() {
  if (firestoreDb) {
    return { app: firebaseApp, db: firestoreDb, auth: firebaseAuth };
  }

  const config = await getFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    console.warn('Firebase configuration missing or incomplete.');
    return { app: null, db: null, auth: null };
  }

  try {
    const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js');
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js');

    firebaseApp = getApps().length === 0 ? initializeApp(config) : getApp();
    firestoreDb = getFirestore(firebaseApp, config.firestoreDatabaseId || undefined);
    firebaseAuth = getAuth(firebaseApp);

    return { app: firebaseApp, db: firestoreDb, auth: firebaseAuth };
  } catch (err) {
    console.error('Failed to initialize Firebase client:', err);
    return { app: null, db: null, auth: null };
  }
}
