require('dotenv').config(); // Load .env

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Load port from env or default
const port = process.env.PORT || 5001;

// ✅ Load trading controller (adjust path if needed)
// Resolve project root (Render may run code from `/opt/render/project/src`)
const PROJECT_ROOT = process.cwd();

// Load trading controller using project root to avoid path issues on Render
const tradeController = require(path.join(PROJECT_ROOT, 'controler.js'));

// ✅ Load routes file (you have routes.js, not folder)
// Load routes file using project root
const tradeRoutes = require(path.join(PROJECT_ROOT, 'route.js'));

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(PROJECT_ROOT, 'public'))); // Serve frontend

// ✅ Use your routes file (if it exports a router)
app.use('/api', tradeRoutes);

// ✅ Root Health Check
// Serve the frontend index for root
app.get('/', (req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'public', 'index.html'));
});

// Lightweight health endpoint for platform health checks
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Fallback: serve index.html for any non-API route (helps client-side routing)
// Note: removed broad SPA fallback because certain environments
// can throw path-to-regexp errors when mounting wildcard routes.
// Static files are served from `public/`, so pages like `/ip.html`
// will be available directly. If you need client-side routing,
// re-add a more specific fallback later.

// ✅ Start the server
const HOST = process.env.HOST || '0.0.0.0';
app.listen(port, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${port}`);
  console.log(`🌐 Visit your app at http://localhost:${port}`);
});
