const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { normalizeConcatenatedEnv, envSummary } = require('./config/env');
normalizeConcatenatedEnv();

const app = express();
const publicDir = path.join(__dirname, 'public');
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

function getClerkPublishableKey() {
  return process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || '';
}

function getClerkFrontendApi() {
  const configured = process.env.CLERK_FRONTEND_API_URL || process.env.CLERK_ISSUER_URL;
  if (configured) return configured.replace(/\/$/, '');

  const key = getClerkPublishableKey();
  const encoded = key.split('_').pop();
  if (!encoded || key.includes('YOUR_CLERK_PUBLISHABLE_KEY')) return '';

  try {
    const domain = Buffer.from(encoded, 'base64').toString('utf8').replace(/\$$/, '');
    return domain ? `https://${domain}` : '';
  } catch (err) {
    return '';
  }
}

function serveIndex(req, res, next) {
  fs.readFile(path.join(publicDir, 'index.html'), 'utf8', (err, html) => {
    if (err) return next(err);

    const publishableKey = getClerkPublishableKey();
    const frontendApi = getClerkFrontendApi();
    let page = html;

    if (publishableKey && !publishableKey.includes('YOUR_CLERK_PUBLISHABLE_KEY')) {
      page = page.replace(/data-clerk-publishable-key="[^"]*"/, `data-clerk-publishable-key="${publishableKey}"`);
    }
    if (frontendApi) {
      page = page
        .replace(/src="https:\/\/[^"]+\/npm\/@clerk\/ui@1\/dist\/ui\.browser\.js"/, `src="${frontendApi}/npm/@clerk/ui@1/dist/ui.browser.js"`)
        .replace(/src="https:\/\/[^"]+\/npm\/@clerk\/clerk-js@6\/dist\/clerk\.browser\.js"/, `src="${frontendApi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js"`);
    }

    res.type('html').send(page);
  });
}

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir, { index: false }));

// ─── Database ────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nikunj')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/clerk',      require('./routes/clerk'));
app.use('/api/listings',   require('./routes/listings'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/ai',         require('./routes/ai'));
app.use('/api/upload',     require('./routes/upload'));
app.use('/api/inquiries',  require('./routes/inquiries'));
app.use('/api/payments',   require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/health/auth', (req, res) => {
  res.json({ success: true, auth: envSummary() });
});

// ─── Serve Frontend (SPA) ─────────────────────────────────────────────────────
app.get('*', (req, res, next) => {
  serveIndex(req, res, next);
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Nikunj server running on http://localhost:${PORT}`));
