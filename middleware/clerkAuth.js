const crypto = require('crypto');

const ROLE_FALLBACK = 'student';
const VALID_ROLES = new Set(['student', 'owner', 'admin']);
const JWKS_CACHE_MS = 5 * 60 * 1000;

let jwksCache = { keys: null, expiresAt: 0 };
const userCache = new Map();

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Buffer.from(padded, 'base64');
}

function decodeJson(value) {
  return JSON.parse(base64UrlDecode(value).toString('utf8'));
}

function getIssuer() {
  if (process.env.CLERK_ISSUER_URL) return process.env.CLERK_ISSUER_URL.replace(/\/$/, '');

  const key = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || '';
  const encoded = key.split('_').pop();
  if (!encoded) throw new Error('Missing CLERK_PUBLISHABLE_KEY');

  const domain = Buffer.from(encoded, 'base64').toString('utf8').replace(/\$$/, '');
  return `https://${domain}`;
}

function getSecretKey() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey || secretKey === 'sk_test_...') {
    throw new Error('Missing CLERK_SECRET_KEY');
  }
  return secretKey;
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function fetchJwks() {
  const now = Date.now();
  if (jwksCache.keys && jwksCache.expiresAt > now) return jwksCache.keys;

  const response = await fetch(`${getIssuer()}/.well-known/jwks.json`);
  if (!response.ok) throw new Error('Unable to fetch Clerk JWKS');

  const jwks = await response.json();
  jwksCache = { keys: jwks.keys || [], expiresAt: now + JWKS_CACHE_MS };
  return jwksCache.keys;
}

async function verifySessionToken(token) {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error('Invalid session token');
  }

  const header = decodeJson(encodedHeader);
  const payload = decodeJson(encodedPayload);
  if (header.alg !== 'RS256') throw new Error('Unsupported token algorithm');

  const keys = await fetchJwks();
  const jwk = keys.find(key => key.kid === header.kid);
  if (!jwk) throw new Error('No matching Clerk signing key');

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const signature = base64UrlDecode(encodedSignature);
  if (!verifier.verify(publicKey, signature)) throw new Error('Invalid session signature');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp <= now) throw new Error('Session token expired');
  if (payload.nbf && payload.nbf > now) throw new Error('Session token not active');
  if (payload.iss !== getIssuer()) throw new Error('Invalid token issuer');
  if (!payload.sub) throw new Error('Missing Clerk user id');

  return payload;
}

async function getClerkUser(userId) {
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.user;

  const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${getSecretKey()}` }
  });
  if (!response.ok) throw new Error('Unable to fetch Clerk user');

  const user = await response.json();
  userCache.set(userId, { user, expiresAt: Date.now() + 60 * 1000 });
  return user;
}

function normalizeRole(value) {
  return VALID_ROLES.has(value) ? value : ROLE_FALLBACK;
}

function toSafeUser(clerkUser, tokenPayload) {
  const privateMetadata = clerkUser.privateMetadata || clerkUser.private_metadata || {};
  const email =
    clerkUser.emailAddresses?.find(email => email.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
    clerkUser.email_addresses?.find(email => email.id === clerkUser.primary_email_address_id)?.email_address ||
    '';
  const firstName = clerkUser.firstName || clerkUser.first_name || '';
  const lastName = clerkUser.lastName || clerkUser.last_name || '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || email || 'User';

  return {
    id: tokenPayload.sub,
    name,
    email,
    role: normalizeRole(privateMetadata.role),
    ownerVerification: privateMetadata.ownerVerification || privateMetadata.owner_verification || null,
    savedListings: []
  };
}

async function requireClerkAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });

    const tokenPayload = await verifySessionToken(token);
    const clerkUser = await getClerkUser(tokenPayload.sub);
    req.clerkUser = clerkUser;
    req.auth = toSafeUser(clerkUser, tokenPayload);
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Clerk session invalid' });
  }
}

async function getSafeUserFromToken(token) {
  const tokenPayload = await verifySessionToken(token);
  const clerkUser = await getClerkUser(tokenPayload.sub);
  return toSafeUser(clerkUser, tokenPayload);
}

const requireClerkRole = (...roles) => (req, res, next) => {
  if (!req.auth || !roles.includes(req.auth.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

module.exports = {
  requireClerkAuth,
  requireClerkRole,
  getSafeUserFromToken,
  getSecretKey,
  normalizeRole
};
