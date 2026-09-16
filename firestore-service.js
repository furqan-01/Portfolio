// Server-side Firestore integration via REST API
// Uses the provisioned Firebase configuration to securely read/write Firestore documents
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let __dirname = '';
try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (e) {
  __dirname = process.cwd();
}

// Built-in default configuration for the project's provisioned Firebase instance
const DEFAULT_FIREBASE_CONFIG = {
  projectId: "metal-photon-1lcf1",
  appId: "1:534408087629:web:6573953764a54119fd3404",
  apiKey: "AIzaSyBMo48b3e30QxRRZrnVk3M_JQP3pUyo80Q",
  authDomain: "metal-photon-1lcf1.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-responsiveportfo-a815eb56-2bcb-4a43-90e6-ec0e91751b7d",
  storageBucket: "metal-photon-1lcf1.firebasestorage.app",
  messagingSenderId: "534408087629",
  measurementId: "",
  oAuthClientId: "534408087629-oa79ubv01d44bl93jmn4g12du91nonbe.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

let cachedConfig = null;

export function getFirebaseAppletConfig() {
  if (cachedConfig) return cachedConfig;

  // 1. Check process environment variables (Netlify or custom hosting)
  if (process.env.FIREBASE_CONFIG) {
    try {
      cachedConfig = JSON.parse(process.env.FIREBASE_CONFIG);
      return cachedConfig;
    } catch (e) {}
  }

  if (process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID) {
    cachedConfig = {
      ...DEFAULT_FIREBASE_CONFIG,
      projectId: process.env.FIREBASE_PROJECT_ID,
      apiKey: process.env.FIREBASE_API_KEY,
      firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId
    };
    return cachedConfig;
  }

  // 2. Check local JSON file across various bundle directories
  const candidateDirs = [
    __dirname,
    process.cwd(),
    path.join(__dirname, '..'),
    path.join(__dirname, '..', '..')
  ];

  for (const dir of candidateDirs) {
    try {
      const configPath = path.join(dir, 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        cachedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return cachedConfig;
      }
    } catch (err) {}
  }

  // 3. Robust fallback to default configuration
  cachedConfig = { ...DEFAULT_FIREBASE_CONFIG };
  return cachedConfig;
}

// Convert native JS Object to Firestore REST document representation
function toFirestoreValue(val) {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(item => toFirestoreValue(item))
      }
    };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Convert Firestore REST document representation back to native JS Object
function fromFirestoreValue(val) {
  if (!val || typeof val !== 'object') return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('stringValue' in val) return val.stringValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(v => fromFirestoreValue(v));
  }
  if ('mapValue' in val) {
    const obj = {};
    const fields = val.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

function parseFirestoreDocument(doc) {
  if (!doc || !doc.fields) return null;
  const result = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    result[k] = fromFirestoreValue(v);
  }
  return result;
}

// Build Firestore REST Base URL
function getFirestoreBaseUrl() {
  const config = getFirebaseAppletConfig();
  if (!config) return null;
  const projectId = config.projectId;
  const databaseId = config.firestoreDatabaseId || '(default)';
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;
}

// Write Portfolio Content Document to Firestore
export async function savePortfolioToFirestore(portfolioObj) {
  const baseUrl = getFirestoreBaseUrl();
  const config = getFirebaseAppletConfig();
  if (!baseUrl || !config) return false;

  const url = `${baseUrl}/portfolio/content?key=${config.apiKey}`;

  const fields = {};
  for (const [k, v] of Object.entries(portfolioObj)) {
    fields[k] = toFirestoreValue(v);
  }

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn('Firestore write warning:', errText);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Firestore network error writing portfolio:', err.message);
    return false;
  }
}

// Read Portfolio Content Document from Firestore
export async function getPortfolioFromFirestore() {
  const baseUrl = getFirestoreBaseUrl();
  const config = getFirebaseAppletConfig();
  if (!baseUrl || !config) return null;

  const url = `${baseUrl}/portfolio/content?key=${config.apiKey}`;

  try {
    const res = await fetch(url);
    if (res.status === 404) {
      return null;
    }
    if (res.ok) {
      const data = await res.json();
      return parseFirestoreDocument(data);
    }
  } catch (err) {
    console.warn('Firestore network error reading portfolio:', err.message);
  }
  return null;
}

// Save Inbound Contact Message to Firestore
export async function saveMessageToFirestore(messageObj) {
  const baseUrl = getFirestoreBaseUrl();
  const config = getFirebaseAppletConfig();
  if (!baseUrl || !config) return false;

  const docId = messageObj.id || `msg-${Date.now()}`;
  const url = `${baseUrl}/messages/${docId}?key=${config.apiKey}`;

  const fields = {};
  for (const [k, v] of Object.entries(messageObj)) {
    fields[k] = toFirestoreValue(v);
  }

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    return res.ok;
  } catch (err) {
    console.warn('Firestore network error saving message:', err.message);
    return false;
  }
}

// Read All Inbound Messages from Firestore (Using runQuery for reliable indexing & access)
export async function getMessagesFromFirestore() {
  const baseUrl = getFirestoreBaseUrl();
  const config = getFirebaseAppletConfig();
  if (!baseUrl || !config) return null;

  const url = `${baseUrl}:runQuery?key=${config.apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'messages' }]
        }
      })
    });

    if (res.ok) {
      const results = await res.json();
      if (!Array.isArray(results)) return [];
      const messages = [];
      for (const item of results) {
        if (item.document) {
          const parsed = parseFirestoreDocument(item.document);
          const nameParts = item.document.name ? item.document.name.split('/') : [];
          parsed.id = parsed.id || nameParts[nameParts.length - 1];
          messages.push(parsed);
        }
      }
      // Order newest first
      messages.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      return messages;
    }
  } catch (err) {
    console.warn('Firestore network error reading messages via query:', err.message);
  }
  return null;
}

// Delete a Message from Firestore
export async function deleteMessageFromFirestore(messageId) {
  const baseUrl = getFirestoreBaseUrl();
  const config = getFirebaseAppletConfig();
  if (!baseUrl || !config) return false;

  const url = `${baseUrl}/messages/${messageId}?key=${config.apiKey}`;

  try {
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('Firestore network error deleting message:', err.message);
    return false;
  }
}

// Toggle or update Message Read Status in Firestore
export async function updateMessageInFirestore(messageId, readStatus) {
  const baseUrl = getFirestoreBaseUrl();
  const config = getFirebaseAppletConfig();
  if (!baseUrl || !config) return false;

  const url = `${baseUrl}/messages/${messageId}?updateMask.fieldPaths=read&key=${config.apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          read: toFirestoreValue(readStatus)
        }
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('Firestore network error updating message read status:', err.message);
    return false;
  }
}
