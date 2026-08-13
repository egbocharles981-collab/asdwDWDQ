const express = require('express');
const router = express.Router();
const os = require('os');
const axios = require('axios');
const crypto = require('crypto');

// ✅ Import separate controllers
const controler = require('./controler');
const futuresController = require('./autotrader');

// === ROUTES ===

// ✅ 1️⃣ Fetch latest candlestick data
router.get('/candle', async (req, res) => {
  try {
    await controler.getCandles(req, res);
  } catch (error) {
    console.error('❌ /candle route error:', error.message);
    res.status(500).json({ error: 'Failed to fetch candle data' });
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

// ✅ Return Bybit USDT balance (reads API_KEY/SECRET from env)
router.get('/balance', async (req, res) => {
  const API_KEY = process.env.API_KEY;
  const API_SECRET = process.env.API_SECRET;
  const BYBIT_URL = process.env.BYBIT_BASE_URL || 'https://api.bybit.com';
  const RECV_WINDOW = 5000;

  function buildQuery(params) {
    return Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
      .join('&');
  }

  function signParams(params) {
    const query = buildQuery(params);
    return crypto.createHmac('sha256', API_SECRET).update(query).digest('hex');
  }

  async function bybitRequest(path, params = {}) {
    params.api_key = API_KEY;
    params.timestamp = Date.now();
    params.recv_window = RECV_WINDOW;
    const sign = signParams(params);
    const query = buildQuery(params);
    const url = `${BYBIT_URL}${path}?${query}&sign=${sign}`;
    const { data } = await axios.get(url);
    return data;
  }

  try {
    if (!process.env.API_KEY || !process.env.API_SECRET) return res.status(400).json({ error: 'Missing API credentials on server' });
    const data = await bybitRequest('/v5/account/wallet-balance', { coin: 'USDT', accountType: 'UNIFIED' });
    const account = data.result?.list?.find(a => a.accountType === 'UNIFIED') || data.result || {};
    const usdt = account.coin?.find(c => c.coin === 'USDT') || {};
    const total = usdt.equity ?? usdt.walletBalance ?? account.totalWalletBalance ?? null;
    const available = usdt.walletBalance ?? usdt.available_balance ?? null;
    return res.json({ total, available });
  } catch (err) {
    console.error('/balance error', err.message || err);
    return res.status(500).json({ error: 'Failed to fetch balance', details: err.response?.data || err.message });
  }
});

module.exports = router;
