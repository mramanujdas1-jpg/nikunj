const ENV_KEYS = [
  'CLERK_SECRET_KEY',
  'CLERK_PUBLISHABLE_KEY',
  'VITE_CLERK_PUBLISHABLE_KEY',
  'CLERK_FRONTEND_API_URL',
  'CLERK_ISSUER_URL',
  'CORS_ORIGIN'
];

const ASSIGNMENT_RE = /([A-Z][A-Z0-9_]+)=/g;

function cleanEnvValue(value) {
  let cleaned = String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

  ENV_KEYS.forEach(key => {
    const prefix = `${key}=`;
    while (cleaned.startsWith(prefix)) cleaned = cleaned.slice(prefix.length).trim();
  });

  return cleaned;
}

function splitAssignments(value) {
  const text = String(value || '').replace(/\\r\\n|\\n|\\r/g, '\n');
  const matches = [];
  let match;

  ASSIGNMENT_RE.lastIndex = 0;
  while ((match = ASSIGNMENT_RE.exec(text))) {
    matches.push({
      key: match[1],
      valueStart: ASSIGNMENT_RE.lastIndex,
      matchStart: match.index
    });
  }

  return matches.map((item, index) => {
    const next = matches[index + 1];
    const valueEnd = next ? next.matchStart : text.length;
    return [item.key, cleanEnvValue(text.slice(item.valueStart, valueEnd))];
  });
}

function normalizeConcatenatedEnv() {
  const discovered = {};

  Object.values(process.env).forEach(value => {
    if (typeof value !== 'string' || !value.includes('=')) return;
    splitAssignments(value).forEach(([key, parsedValue]) => {
      if (ENV_KEYS.includes(key) && parsedValue) discovered[key] = parsedValue;
    });
  });

  ENV_KEYS.forEach(key => {
    const current = process.env[key];
    if (current && current.includes('=')) {
      splitAssignments(`${key}=${current}`).forEach(([parsedKey, parsedValue]) => {
        if (ENV_KEYS.includes(parsedKey) && parsedValue) discovered[parsedKey] = parsedValue;
      });
    }
  });

  Object.entries(discovered).forEach(([key, value]) => {
    if (!process.env[key] || process.env[key].includes('=')) {
      process.env[key] = value;
    }
  });

  ENV_KEYS.forEach(key => {
    if (process.env[key]) process.env[key] = cleanEnvValue(process.env[key]);
  });

  if (!process.env.VITE_CLERK_PUBLISHABLE_KEY && process.env.CLERK_PUBLISHABLE_KEY) {
    process.env.VITE_CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY;
  }
  if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY) {
    process.env.CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY;
  }
}

function envSummary() {
  return {
    clerkPublishableKey: Boolean(process.env.CLERK_PUBLISHABLE_KEY),
    viteClerkPublishableKey: Boolean(process.env.VITE_CLERK_PUBLISHABLE_KEY),
    clerkSecretKey: Boolean(process.env.CLERK_SECRET_KEY),
    clerkFrontendApiUrl: Boolean(process.env.CLERK_FRONTEND_API_URL || process.env.CLERK_ISSUER_URL)
  };
}

module.exports = {
  normalizeConcatenatedEnv,
  envSummary
};
