const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOKEN_FILENAME = '.task-manager-token';
const TOKEN_PATH = path.join(os.homedir(), TOKEN_FILENAME);

const generateToken = () => crypto.randomBytes(32).toString('hex');

const readTokenFile = () => {
  if (!fs.existsSync(TOKEN_PATH)) {
    return null;
  }

  const token = fs.readFileSync(TOKEN_PATH, 'utf8').trim();
  return token.length > 0 ? token : null;
};

const writeTokenFile = (token) => {
  fs.writeFileSync(TOKEN_PATH, token, 'utf8');
};

const getToken = () => {
  const existing = readTokenFile();
  if (existing) {
    return existing;
  }

  const token = generateToken();
  writeTokenFile(token);
  return token;
};

const getTokenPath = () => TOKEN_PATH;

module.exports = {
  getToken,
  getTokenPath,
};
