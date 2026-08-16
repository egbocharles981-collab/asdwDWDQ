const test = require('node:test');
const assert = require('node:assert/strict');
const { setLeverageIfPossible, buildExitOrderParams, buildSlTpOrders, extractPositionForSymbol, parsePositionEntryPrice, parsePositionQty } = require('../autotrader');

test('returns true when leverage is already set and API reports unchanged', async () => {
  const result = await setLeverageIfPossible(async () => {
    const err = new Error('leverage not modified');
    err.response = { data: { retCode: 110043 } };
    throw err;
  });

  assert.equal(result, true);
});

test('returns true when leverage update succeeds', async () => {
  const result = await setLeverageIfPossible(async () => ({ ok: true }));

  assert.equal(result, true);
});

test('builds v5-compatible take-profit params for a long position', () => {
  const params = buildExitOrderParams('BUY', 100.1234, 0.001, 'TP');

  assert.equal(params.orderType, 'Limit');
  assert.equal(params.side, 'Sell');
  assert.equal(params.triggerPrice, '100.12');
  assert.equal(params.triggerDirection, 1);
  assert.equal(params.reduceOnly, true);
  assert.equal(params.closeOnTrigger, true);
});

test('builds v5-compatible stop-loss params for a long position', () => {
  const params = buildExitOrderParams('BUY', 99.8765, 0.001, 'SL');

  assert.equal(params.orderType, 'Market');
  assert.equal(params.side, 'Sell');
  assert.equal(params.triggerPrice, '99.88');
  assert.equal(params.triggerDirection, 2);
  assert.equal(params.reduceOnly, true);
  assert.equal(params.closeOnTrigger, true);
  assert.equal(params.basePrice, '99.88');
});

test('builds sell-side TP/SL orders for a short trade', () => {
  const orderSet = buildSlTpOrders({ side: 'SELL', entryPrice: 100, qty: 0.5, tpPercent: 0.017, slPercent: 0.009 });

  assert.equal(orderSet.tp, 98.3);
  assert.equal(orderSet.sl, 100.9);
  assert.equal(orderSet.tpOrder.side, 'Buy');
  assert.equal(orderSet.slOrder.side, 'Buy');
});

test('reads Bybit v5 camelCase entryPrice and position size fields', () => {
  const positionInfo = {
    list: [
      { symbol: 'BTCUSDT', entryPrice: '63100.5', size: '0.002' },
      { symbol: 'ETHUSDT', entryPrice: '2000', size: '1' },
    ],
  };

  const position = extractPositionForSymbol(positionInfo, 'BTCUSDT');

  assert.equal(parsePositionEntryPrice(position), 63100.5);
  assert.equal(parsePositionQty(position), 0.002);
});
