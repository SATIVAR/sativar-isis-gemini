
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for potential data migration

// API Key Authentication Middleware
const apiKeyAuth = (req, res, next) => {
  // The health check endpoint should always be public for online/offline detection.
  if (req.path === '/health') {
    return next();
  }

  const apiKey = req.get('X-API-Key');
  const serverKey = process.env.API_SECRET_KEY;
  
  // Security Hardening: If API_SECRET_KEY is not set on the server, all protected requests must fail.
  // This prevents accidentally exposing the API in production.
  if (!serverKey) {
    console.error('CRITICAL: API_SECRET_KEY is not set. The API is un Gaccessible. Please set this variable in your .env file.');
    return res.status(503).json({ error: 'Service Unavailable: API secret key not configured on the server.' });
  }

  if (apiKey && apiKey === serverKey) {
    return next(); // Key is valid
  }

  return res.status(401).json({ error: 'Unauthorized: Missing or invalid API key.' });
};


// API Routes - all are protected by the auth middleware
app.use('/api', apiKeyAuth, apiRoutes);

app.listen(port, () => {
  console.log(`SATIVAR-ISIS Backend listening at http://localhost:${port}`);
  if (!process.env.API_SECRET_KEY) {
      console.error('CRITICAL SECURITY WARNING: API_SECRET_KEY is not defined in the environment. The API will not be accessible.');
  }
});