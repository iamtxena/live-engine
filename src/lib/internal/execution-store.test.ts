import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cancelOrder,
  createDeployment,
  getDeployment,
  getOrder,
  mapCancelTransition,
  placeOrder,
  resetExecutionStore,
  stopDeployment,
} from '@/lib/internal/execution-store';

test('deployment lifecycle transitions map to adapter semantics', () => {
  resetExecutionStore();
  const deployment = createDeployment({
    strategyId: 'strat-abc',
    mode: 'paper',
    capital: 10000,
  });
  assert.equal(deployment.status, 'queued');

  const fetchedByProviderRef = getDeployment(deployment.providerRefId);
  assert.ok(fetchedByProviderRef);
  assert.equal(fetchedByProviderRef.id, deployment.id);

  const stopped = stopDeployment(deployment.providerRefId);
  assert.ok(stopped);
  assert.equal(stopped.status, 'stopping');
});

test('order lifecycle supports provider-id lookup and cancellation', () => {
  resetExecutionStore();
  const order = placeOrder({
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'market',
    quantity: 0.2,
    price: null,
    deploymentId: null,
  });
  assert.equal(order.status, 'pending');
  assert.equal(order.providerOrderId, 'live-order-002');

  const fetched = getOrder(order.providerOrderId);
  assert.ok(fetched);
  assert.equal(fetched.id, order.id);

  const cancelled = cancelOrder(order.providerOrderId);
  assert.ok(cancelled);
  assert.equal(cancelled.status, 'cancelled');
});

test('cancel transition preserves terminal order states', () => {
  assert.equal(mapCancelTransition('pending'), 'cancelled');
  assert.equal(mapCancelTransition('filled'), 'filled');
  assert.equal(mapCancelTransition('cancelled'), 'cancelled');
  assert.equal(mapCancelTransition('rejected'), 'rejected');
  assert.equal(mapCancelTransition('failed'), 'failed');
});
