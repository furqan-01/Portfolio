// Server-side Firestore integration via REST API
// Uses the provisioned Firebase configuration to securely read/write Firestore documents
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedConfig = null;

export function getFirebaseAppletConfig() {
  if (cachedConfig) return cachedConfig;
  try {
    const configPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      cachedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return cachedConfig;
    }
  } catch (err) {
    console.error('Error reading firebase-applet-config.json:', err);
  }
  return null;
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

// Save Portfolio Content Document to Firestore
export async function savePortfolioToFirestore(portfolioData) {
  const baseUrl = getFirestoreBaseUrl();
  const config = getFirebaseAppletConfig();
  if (!baseUrl || !config) return false;

  const url = `${baseUrl}/portfolio/content?key=${config.apiKey}`;
  const fields = {};
  for (const [k, v] of Object.entries(portfolioData)) {
    fields[k] = toFirestoreValue(v);
  }
  fields['updatedAt'] = toFirestoreValue(new Date().toISOString());

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
    console.warn('Firestore network error writing portfolio:', err);
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
    console.warn('Firestore network error reading portfolio:', err);
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
    console.warn('Firestore network error saving message:', err);
    return false;
  }
}

// Read All Inbound Messages from Firestore
export async function getMessagesFromFirestore() {
  const baseUrl = getFirestoreBaseUrl();
  const config = getFirebaseAppletConfig();
  if (!baseUrl || !config) return null;

  const url = `${baseUrl}/messages?key=${config.apiKey}&pageSize=100`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const documents = data.documents || [];
      return documents.map(d => {
        const parsed = parseFirestoreDocument(d);
        const nameParts = d.name ? d.name.split('/') : [];
        parsed.id = parsed.id || nameParts[nameParts.length - 1];
        return parsed;
      });
    }
  } catch (err) {
    console.warn('Firestore network error reading messages:', err);
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
    console.warn('Firestore network error deleting message:', err);
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
    console.warn('Firestore network error updating message read status:', err);
    return false;
  }
}
