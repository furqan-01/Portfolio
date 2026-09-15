// Reusable API Request Handler (Pure Node.js - No framework dependencies)
// Compatible with native Node.js HTTP server and Netlify Serverless Functions
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  savePortfolioToFirestore,
  getPortfolioFromFirestore,
  saveMessageToFirestore,
  getMessagesFromFirestore,
  deleteMessageFromFirestore,
  updateMessageInFirestore
} from './firestore-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'portfolio-data.json');
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin-config.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    // Ignore in read-only serverless environment
  }
}

export function readJson(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

export function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn(`Notice writing ${filePath} (read-only in some serverless environments):`, err.message);
    return false;
  }
}

export function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

export function verifyAdminToken(headers) {
  const authHeader = headers['authorization'] || headers['Authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7)
    : (headers['x-admin-token'] || headers['X-Admin-Token']);

  if (!token) return null;

  const config = readJson(ADMIN_CONFIG_FILE, { activeSessions: [] });
  const validSession = (config.activeSessions || []).find(s => s.token === token);
  if (!validSession) return null;
  if (new Date(validSession.expiresAt) <= new Date()) return null;

  return validSession;
}

// Main API Dispatcher
export async function handleApiRequest({ method, pathname, headers, body }) {
  const normalizedPath = pathname.replace(/^\/\.netlify\/functions\/api/, '/api');
  const upperMethod = (method || 'GET').toUpperCase();

  // 1. Health check: GET /api/health
  if (upperMethod === 'GET' && normalizedPath === '/api/health') {
    return {
      status: 200,
      data: { status: 'ok', runtime: 'node.js', timestamp: new Date().toISOString() }
    };
  }

  // 2. Public: Get Portfolio Content: GET /api/portfolio
  if (upperMethod === 'GET' && normalizedPath === '/api/portfolio') {
    try {
      const cloudData = await getPortfolioFromFirestore();
      if (cloudData && cloudData.profile) {
        writeJson(PORTFOLIO_FILE, cloudData);
        return { status: 200, data: cloudData };
      }
    } catch (err) {
      console.warn('Firestore fetch fallback to local:', err.message);
    }
    const localData = readJson(PORTFOLIO_FILE, {});
    return { status: 200, data: localData };
  }

  // 3. Public: Submit Contact Inquiry: POST /api/contact
  if (upperMethod === 'POST' && normalizedPath === '/api/contact') {
    const { name, email, subject, message } = body || {};
    if (!name || !email || !message) {
      return { status: 400, data: { error: 'Name, email, and message are required.' } };
    }

    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: String(name).trim(),
      email: String(email).trim(),
      subject: String(subject || 'Portfolio Inquiry').trim(),
      message: String(message).trim(),
      timestamp: new Date().toISOString(),
      read: false
    };

    // Save local backup
    const messages = readJson(MESSAGES_FILE, []);
    messages.unshift(newMessage);
    writeJson(MESSAGES_FILE, messages);

    // Save to Firestore
    try {
      await saveMessageToFirestore(newMessage);
    } catch (err) {
      console.warn('Cloud message persistence notice:', err.message);
    }

    return {
      status: 201,
      data: { success: true, message: 'Message received and saved successfully.' }
    };
  }

  // 4. Admin: Login: POST /api/admin/login
  if (upperMethod === 'POST' && normalizedPath === '/api/admin/login') {
    const { username, password } = body || {};
    if (!username || !password) {
      return { status: 400, data: { error: 'Username/Email and password are required.' } };
    }

    const config = readJson(ADMIN_CONFIG_FILE, {
      adminUsername: 'admin',
      adminEmail: 'furqannaveed377@gmail.com',
      salt: 'fn_portfolio_salt_2026'
    });

    const salt = config.salt || 'fn_portfolio_salt_2026';
    const inputHash = hashPassword(password, salt);

    const isMatch = config.passwordHash
      ? (inputHash === config.passwordHash || (password === 'admin123' && config.passwordHint === 'admin123'))
      : (password === 'admin123');

    const isUserValid = (
      username === config.adminUsername ||
      username.toLowerCase() === (config.adminEmail || '').toLowerCase() ||
      username === 'admin'
    );

    if (isMatch && isUserValid) {
      const token = crypto.randomBytes(32).toString('hex');
      const newSession = {
        token,
        username: config.adminUsername,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const sessions = (config.activeSessions || []).filter(s => new Date(s.expiresAt) > new Date());
      sessions.push(newSession);
      config.activeSessions = sessions;
      writeJson(ADMIN_CONFIG_FILE, config);

      return {
        status: 200,
        data: {
          success: true,
          token,
          username: config.adminUsername,
          email: config.adminEmail
        }
      };
    }

    return { status: 401, data: { error: 'Invalid username or password.' } };
  }

  // Auth Guard for remaining /api/admin/* endpoints
  if (normalizedPath.startsWith('/api/admin/')) {
    const session = verifyAdminToken(headers);
    if (!session) {
      return { status: 401, data: { error: 'Unauthorized. Admin token required.' } };
    }

    // 5. Admin: Verify Session: GET /api/admin/verify
    if (upperMethod === 'GET' && normalizedPath === '/api/admin/verify') {
      const config = readJson(ADMIN_CONFIG_FILE, {});
      return {
        status: 200,
        data: {
          valid: true,
          username: config.adminUsername || 'admin',
          email: config.adminEmail || 'furqannaveed377@gmail.com'
        }
      };
    }

    // 6. Admin: Logout: POST /api/admin/logout
    if (upperMethod === 'POST' && normalizedPath === '/api/admin/logout') {
      const authHeader = headers['authorization'] || headers['Authorization'];
      const token = (authHeader && authHeader.startsWith('Bearer '))
        ? authHeader.slice(7)
        : (headers['x-admin-token'] || headers['X-Admin-Token']);

      const config = readJson(ADMIN_CONFIG_FILE, {});
      if (config.activeSessions && token) {
        config.activeSessions = config.activeSessions.filter(s => s.token !== token);
        writeJson(ADMIN_CONFIG_FILE, config);
      }
      return { status: 200, data: { success: true, message: 'Logged out successfully.' } };
    }

    // 7. Admin: Update Portfolio Data: PUT /api/admin/portfolio
    if (upperMethod === 'PUT' && normalizedPath === '/api/admin/portfolio') {
      const updatedData = body;
      if (!updatedData || typeof updatedData !== 'object') {
        return { status: 400, data: { error: 'Invalid portfolio data payload.' } };
      }

      const localSuccess = writeJson(PORTFOLIO_FILE, updatedData);
      let cloudSuccess = false;
      try {
        cloudSuccess = await savePortfolioToFirestore(updatedData);
      } catch (err) {
        console.warn('Cloud sync warning:', err.message);
      }

      if (localSuccess || cloudSuccess) {
        return {
          status: 200,
          data: {
            success: true,
            message: 'Portfolio data updated successfully.',
            cloudSynced: cloudSuccess
          }
        };
      }
      return { status: 500, data: { error: 'Failed to write portfolio data.' } };
    }

    // 8. Admin: Change Password: POST /api/admin/change-password
    if (upperMethod === 'POST' && normalizedPath === '/api/admin/change-password') {
      const { currentPassword, newPassword } = body || {};
      if (!newPassword || newPassword.length < 6) {
        return { status: 400, data: { error: 'New password must be at least 6 characters.' } };
      }

      const config = readJson(ADMIN_CONFIG_FILE, {});
      const salt = config.salt || 'fn_portfolio_salt_2026';
      const currentHash = hashPassword(currentPassword || '', salt);

      const isCurrentValid = (currentHash === config.passwordHash) || (currentPassword === 'admin123');
      if (!isCurrentValid) {
        return { status: 400, data: { error: 'Current password is incorrect.' } };
      }

      config.passwordHash = hashPassword(newPassword, salt);
      delete config.passwordHint;
      writeJson(ADMIN_CONFIG_FILE, config);

      return { status: 200, data: { success: true, message: 'Password updated successfully.' } };
    }

    // 9. Admin: Get Contact Messages: GET /api/admin/messages
    if (upperMethod === 'GET' && normalizedPath === '/api/admin/messages') {
      const localMessages = readJson(MESSAGES_FILE, []);
      try {
        const cloudMessages = await getMessagesFromFirestore();
        if (cloudMessages && cloudMessages.length > 0) {
          const map = new Map();
          localMessages.forEach(m => map.set(m.id, m));
          cloudMessages.forEach(m => map.set(m.id, m));
          const merged = Array.from(map.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          writeJson(MESSAGES_FILE, merged);
          return { status: 200, data: merged };
        }
      } catch (err) {
        console.warn('Firestore messages fetch notice:', err.message);
      }
      return { status: 200, data: localMessages };
    }

    // 10. Admin: Toggle Message Read Status: PATCH /api/admin/messages/:id/read
    const readMatch = normalizedPath.match(/^\/api\/admin\/messages\/([^/]+)\/read$/);
    if (upperMethod === 'PATCH' && readMatch) {
      const id = decodeURIComponent(readMatch[1]);
      const messages = readJson(MESSAGES_FILE, []);
      const msg = messages.find(m => m.id === id);

      if (!msg) {
        return { status: 404, data: { error: 'Message not found.' } };
      }

      msg.read = !msg.read;
      writeJson(MESSAGES_FILE, messages);

      try {
        await updateMessageInFirestore(id, msg.read);
      } catch (err) {
        console.warn('Firestore message read status sync notice:', err.message);
      }

      return { status: 200, data: { success: true, message: msg } };
    }

    // 11. Admin: Delete Contact Message: DELETE /api/admin/messages/:id
    const deleteMatch = normalizedPath.match(/^\/api\/admin\/messages\/([^/]+)$/);
    if (upperMethod === 'DELETE' && deleteMatch) {
      const id = decodeURIComponent(deleteMatch[1]);
      let messages = readJson(MESSAGES_FILE, []);
      messages = messages.filter(m => m.id !== id);
      writeJson(MESSAGES_FILE, messages);

      try {
        await deleteMessageFromFirestore(id);
      } catch (err) {
        console.warn('Firestore message deletion notice:', err.message);
      }

      return { status: 200, data: { success: true, message: 'Message deleted.' } };
    }
  }

  // Not found
  return {
    status: 404,
    data: { error: `Endpoint not found: ${upperMethod} ${normalizedPath}` }
  };
}
