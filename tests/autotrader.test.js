const test = require('node:test');
const assert = require('node:assert/strict');
const { setLeverageIfPossible, buildExitOrderParams, buildSlTpOrders, extractPositionForSymbol, parsePositionEntryPrice, parsePositionQty, getNextTrailingStopPrice } = require('../autotrader');
const { buildClosePositionOrder } = require('../closeAllTrades');

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
  assert.equal(params.timeInForce, 'GTC');
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

test('keeps long trailing stops from moving backward after a price pullback', () => {
  const priorStop = 64640;
  const nextStop = getNextTrailingStopPrice('BUY', 64790, 200, priorStop);

  assert.equal(nextStop, 64640);
});

test('keeps short trailing stops from moving backward after a price bounce', () => {
  const priorStop = 64620;
  const nextStop = getNextTrailingStopPrice('SELL', 64600, 200, priorStop);

  assert.equal(nextStop, 64620);
});

test('moves a long stop only in the profit direction', () => {
  const stop = getNextTrailingStopPrice('BUY', 64830, 200, 64640);
  assert.equal(stop, 64640);
  const betterStop = getNextTrailingStopPrice('BUY', 64950, 200, 64640);
  assert.equal(betterStop, 64750);
});

test('builds a valid Bybit close-all market order for linear contracts', () => {
  const order = buildClosePositionOrder('BTCUSDT', 'Sell', 0.002);

  assert.equal(order.category, 'linear');
  assert.equal(order.side, 'Sell');
  assert.equal(order.orderType, 'Market');
  assert.equal(order.qty, '0.002');
  assert.equal(order.reduceOnly, true);
  assert.equal(order.positionIdx, 0);
  assert.equal(order.orderFilter, 'Order');
});
