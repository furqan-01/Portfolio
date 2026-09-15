// Pure Node.js Server (Zero Express Dependencies)
// Native Node.js HTTP server optimized for standard container runtime & local development
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleApiRequest, readJson } from './api-handler.js';
import { getPortfolioFromFirestore, savePortfolioToFirestore } from './firestore-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'portfolio-data.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml'
};

// Helper: Send JSON Response
function sendJson(res, statusCode, data, extraHeaders = {}) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    ...extraHeaders
  });
  res.end(payload);
}

// Helper: Serve Static File
function serveStaticFile(res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If not found, serve index.html for SPA routing
      const indexFile = path.join(__dirname, 'index.html');
      fs.readFile(indexFile, (fallbackErr, data) => {
        if (fallbackErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        } else {
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Length': Buffer.byteLength(data)
          });
          res.end(data);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Access-Control-Allow-Origin': '*'
    };

    if (ext === '.css' || ext === '.js' || ext === '.png' || ext === '.jpg' || ext === '.svg') {
      headers['Cache-Control'] = 'public, max-age=86400';
    }

    res.writeHead(200, headers);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

// Helper: Read Request Body
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let rawData = '';
    const maxLimit = 10 * 1024 * 1024; // 10MB limit

    req.on('data', chunk => {
      rawData += chunk;
      if (rawData.length > maxLimit) {
        reject(new Error('Request body exceeded 10MB limit'));
        req.destroy();
      }
    });

    req.on('end', () => {
      const contentType = req.headers['content-type'] || '';
      if (rawData && (contentType.includes('application/json') || rawData.trim().startsWith('{') || rawData.trim().startsWith('['))) {
        try {
          resolve(JSON.parse(rawData));
          return;
        } catch (e) {
          // If JSON parse fails, provide raw string
          resolve(rawData);
          return;
        }
      }
      resolve(rawData ? { raw: rawData } : null);
    });

    req.on('error', err => reject(err));
  });
}

// Native Node.js Server Instance
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    });
    res.end();
    return;
  }

  const host = req.headers.host || `localhost:${PORT}`;
  const parsedUrl = new URL(req.url, `http://${host}`);
  const pathname = parsedUrl.pathname;

  // 1. API Route Handler
  if (pathname.startsWith('/api/')) {
    try {
      const body = await readRequestBody(req);
      const apiResult = await handleApiRequest({
        method: req.method,
        pathname,
        headers: req.headers,
        body
      });
      sendJson(res, apiResult.status, apiResult.data, apiResult.headers);
    } catch (err) {
      console.error('API Error:', err);
      sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  // 2. Secret Admin Route Handler
  if (pathname === '/admin' || pathname === '/admin/' || pathname.startsWith('/admin/')) {
    serveStaticFile(res, path.join(__dirname, 'admin.html'));
    return;
  }

  // 3. Static Assets & Pages
  // Sanitize file path to prevent directory traversal
  let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '') {
    safePath = '/index.html';
  }

  const targetFile = path.join(__dirname, safePath);

  // Security check: ensure target file is within root directory
  if (!targetFile.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  serveStaticFile(res, targetFile);
});

// Start Native Node.js Server
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Native Node.js server running at http://0.0.0.0:${PORT} (Express shifted to pure Node.js)`);

  // Initial sync check: sync Firestore portfolio if not present
  try {
    const cloudPortfolio = await getPortfolioFromFirestore();
    if (!cloudPortfolio || !cloudPortfolio.profile) {
      const localPortfolio = readJson(PORTFOLIO_FILE, {});
      if (localPortfolio && localPortfolio.profile) {
        console.log('Seeding initial portfolio data into Firestore...');
        await savePortfolioToFirestore(localPortfolio);
        console.log('Firestore initial portfolio seed completed.');
      }
    } else {
      console.log('Firestore portfolio content is active.');
    }
  } catch (err) {
    console.warn('Initial Firestore seed check notice:', err.message);
  }
});
