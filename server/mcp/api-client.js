const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');
const path = require('path');
const { URL } = require('url');

const DEFAULT_BASE = 'http://127.0.0.1:3123';
const DEFAULT_TOKEN_PATH = path.join(os.homedir(), '.task-manager-token');

const readToken = () => {
  const envToken = (process.env.TM_API_TOKEN || '').trim();
  if (envToken) {
    return envToken;
  }

  const tokenPath = process.env.TM_API_TOKEN_PATH || DEFAULT_TOKEN_PATH;
  try {
    return fs.readFileSync(tokenPath, 'utf8').trim();
  } catch (error) {
    return null;
  }
};

const requestJson = (method, baseUrl, endpoint, body) => {
  const token = readToken();
  if (!token) {
    throw new Error('TM_API_TOKEN or token file is required');
  }

  const url = new URL(endpoint, baseUrl);
  const payload = body ? JSON.stringify(body) : null;
  const transport = url.protocol === 'https:' ? https : http;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  if (payload) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(payload);
  }

  return new Promise((resolve, reject) => {
    const req = transport.request(
      url,
      { method, headers },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const status = res.statusCode || 0;
          let parsed = null;
          if (data) {
            try {
              parsed = JSON.parse(data);
            } catch (error) {
              parsed = null;
            }
          }
          if (status >= 400) {
            const message =
              parsed && parsed.error
                ? parsed.error
                : data || `Request failed with status ${status}`;
            const error = new Error(message);
            error.status = status;
            error.payload = parsed;
            reject(error);
            return;
          }
          resolve(parsed);
        });
      }
    );

    req.on('error', (error) => {
      reject(error);
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
};

const createApiClient = () => {
  const baseUrl = process.env.TM_API_BASE || DEFAULT_BASE;

  return {
    get: (endpoint) => requestJson('GET', baseUrl, endpoint),
    post: (endpoint, body) => requestJson('POST', baseUrl, endpoint, body),
    patch: (endpoint, body) => requestJson('PATCH', baseUrl, endpoint, body),
  };
};

module.exports = createApiClient;
