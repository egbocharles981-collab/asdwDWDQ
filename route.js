const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');

// ✅ Import separate controllers
const controler = require('./controler');
const futuresController = require('./autotrader');

// === ROUTES ===

// ✅ 1️⃣ Fetch latest candlestick data
router.get('/candle', async (req, res) => {
  const symbol = req.query.symbol || 'BTCUSDT';
  const interval = req.query.interval || '5m';
  console.log(`📊 /candle request - Symbol: ${symbol}, Interval: ${interval}`);
  try {
    await controler.getCandles(req, res);
  } catch (error) {
    console.error('❌ /candle route error:', error.message);
    res.status(500).json({ error: 'Failed to fetch candle data', details: error.message });
  }
});

// ✅ 2️⃣ Execute a manual trade (Spot)
router.post('/trade', async (req, res) => {
  try {
    await controler.executeTrade(req, res);
  } catch (error) {
    console.error('❌ /trade route error:', error.message);
    res.status(500).json({ error: 'Failed to execute trade' });
  }
});

// ✅ 3️⃣ Start the Futures trading watcher loop
router.post('/futures/start', async (req, res) => {
  try {
    futuresController.startTradingWatcher();
    console.log('🚀 Trading watcher started');
    res.json({ success: true, message: 'Trading watcher started successfully.' });
  } catch (error) {
    console.error('❌ Failed to start watcher:', error.message);
    res.status(500).json({ success: false, message: 'Failed to start watcher', error: error.message });
  }
});

// ✅ 4️⃣ Stop the Futures trading watcher loop
router.post('/futures/stop', async (req, res) => {
  try {
    futuresController.stopTradingWatcher();
    console.log('🛑 Trading watcher stopped');
    res.json({ success: true, message: 'Trading watcher stopped successfully.' });
  } catch (error) {
    console.error('❌ Failed to stop watcher:', error.message);
    res.status(500).json({ success: false, message: 'Failed to stop watcher', error: error.message });
  }
});

// ✅ 5️⃣ Read the recent trading events for the frontend activity box
router.get('/trade-logs', (req, res) => {
  try {
    const logPath = path.join(__dirname, 'trading-log.txt');
    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, '');
    }

    const data = fs.readFileSync(logPath, 'utf8');
    const lines = data.split(/\r?\n/).filter(Boolean).slice(-60);
    res.json({ logs: lines });
  } catch (error) {
    console.error('❌ /trade-logs route error:', error.message);
    res.status(500).json({ logs: [], error: error.message });
  }
});

// ✅ Return only the public IP (via api.ipify.org)
router.get('/ip', async (req, res) => {
  try {
    let publicIp = null;
    try {
      const r = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
      publicIp = r.data?.ip || null;
    } catch (e) {
      publicIp = null;
    }

    if (!publicIp) {
      return res.status(502).json({ error: 'Failed to fetch public IP' });
    }

    res.json({ publicIp });
  } catch (err) {
    console.error('❌ /ip route error:', err.message);
    res.status(500).json({ error: 'Failed to determine public IP' });
  }
});

// ✅ 6️⃣ Get account balance
router.get('/balance', async (req, res) => {
  try {
    await controler.getBalance(req, res);
  } catch (error) {
    console.error('❌ /balance route error:', error.message);
    res.status(500).json({ error: 'Failed to fetch balance', total: 'N/A', available: 'N/A' });
  }
});

// ✅ 7️⃣ Get futures trading watcher status
router.get('/futures/status', (req, res) => {
  try {
    const isRunning = futuresController.isTradingWatcherRunning() || false;
    res.json({ running: isRunning });
  } catch (error) {
    console.error('❌ /futures/status route error:', error.message);
    res.status(500).json({ running: false, error: error.message });
  }
});

// ✅ 8️⃣ Get recent logs (configurable line count)
router.get('/logs', (req, res) => {
  try {
    const lines = parseInt(req.query.lines) || 500;
    const logPath = path.join(__dirname, 'trading-log.txt');
    
    if (!fs.existsSync(logPath)) {
      return res.json({ lines: [] });
    }

    const data = fs.readFileSync(logPath, 'utf8');
    const allLines = data.split(/\r?\n/).filter(Boolean);
    const recentLines = allLines.slice(-Math.max(1, lines));
    
    res.json({ lines: recentLines });
  } catch (error) {
    console.error('❌ /logs route error:', error.message);
    res.status(500).json({ lines: [], error: error.message });
  }
});

module.exports = router;
