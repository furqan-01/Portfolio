// Netlify Serverless Function Handler (Pure Node.js)
import { handleApiRequest } from '../../api-handler.js';

export async function handler(event, context) {
  // Extract path and clean it
  let pathname = event.path || '';

  // In Netlify redirects, path might be /.netlify/functions/api/... or /api/... or /admin/...
  if (pathname.includes('/.netlify/functions/api')) {
    pathname = pathname.replace(/^\/\.netlify\/functions\/api/, '/api');
  } else if (pathname.includes('/functions/api')) {
    pathname = pathname.replace(/^.*\/functions\/api/, '/api');
  } else if (!pathname.startsWith('/api')) {
    pathname = '/api' + (pathname.startsWith('/') ? pathname : '/' + pathname);
  }

  // Parse request body
  let body = null;
  if (event.body) {
    try {
      body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
        : (typeof event.body === 'string' ? JSON.parse(event.body) : event.body);
    } catch (err) {
      body = event.body;
    }
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  try {
    const response = await handleApiRequest({
      method: event.httpMethod,
      pathname,
      headers: event.headers || {},
      body
    });

    return {
      statusCode: response.status || 200,
      headers: { ...headers, ...(response.headers || {}) },
      body: JSON.stringify(response.data)
    };
  } catch (err) {
    console.error('Error in Netlify API function:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: err.message })
    };
  }
}
