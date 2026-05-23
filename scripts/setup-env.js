const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '..', '.env');

// Generate fresh secrets
const masterKey = crypto.randomBytes(32).toString('hex');
const jwtSecret = crypto.randomBytes(32).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(32).toString('hex');

let existingEnv = '';
if (fs.existsSync(envPath)) {
  existingEnv = fs.readFileSync(envPath, 'utf8');
}

const envVars = {
  DATABASE_URL: 'postgresql://postgres:postgres_password@db:5432/health_portal',
  REDIS_URL: 'redis://redis:6379',
  MASTER_KEY: masterKey,
  JWT_SECRET: jwtSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  STRIPE_SECRET_KEY: 'sk_test_dummy',
  STRIPE_WEBHOOK_SECRET: 'whsec_dummy',
};

const lines = existingEnv.split('\n');
const parsed = {};

for (const line of lines) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    parsed[key] = value.trim();
  }
}

// Merge variables without overwriting existing manually defined secrets
for (const [key, defaultValue] of Object.entries(envVars)) {
  if (!parsed[key]) {
    parsed[key] = defaultValue;
    console.log(`Setting dynamic default for ${key}`);
  }
}

const finalContent = Object.entries(parsed)
  .map(([key, val]) => `${key}="${val}"`)
  .join('\n');

fs.writeFileSync(envPath, finalContent, 'utf8');
console.log('.env file configured successfully.');
