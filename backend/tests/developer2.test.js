import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

const app = createApp({
  databaseCheck: async () => true
});

// Helper for testing express app routes
async function request(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const body = options.body ? JSON.stringify(options.body) : undefined;

  return new Promise((resolve, reject) => {
    // Start temporary ephemeral server for test request
    const server = app.listen(0, async () => {
      const port = server.address().port;
      const url = `http://localhost:${port}${path}`;
      try {
        const response = await fetch(url, { method, headers, body });
        const text = await response.text();
        server.close();
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {
          json = text;
        }
        resolve({ status: response.status, headers: response.headers, body: json });
      } catch (err) {
        server.close();
        reject(err);
      }
    });
  });
}

test('Module 3: GET /api/alerts/low-stock returns deficit and suggested reorders', async () => {
  const res = await request('/api/alerts/low-stock');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length > 0);
  const alert = res.body.data[0];
  assert.ok(alert.item_id);
  assert.ok(alert.deficit >= 0);
  assert.ok(alert.suggested_reorder > 0);
});

test('Module 3: Suppliers CRUD endpoints work as expected', async () => {
  // List suppliers
  const listRes = await request('/api/suppliers');
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.success, true);
  assert.ok(Array.isArray(listRes.body.data));
  assert.ok(listRes.body.data.length >= 4);

  // Create new supplier
  const createRes = await request('/api/suppliers', {
    method: 'POST',
    body: {
      name: 'Omni Electronics Supply Test',
      contact_name: 'Alex Rivera',
      email: 'alex@omnielec.test',
      phone: '+1 555-0100',
      address: '99 Test Highway',
      rating: 4.9
    }
  });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.success, true);
  assert.equal(createRes.body.data.name, 'Omni Electronics Supply Test');
});

test('Module 3: Purchase Orders lifecycle (CREATE, RECEIVE)', async () => {
  // Create PO
  const createPoRes = await request('/api/purchase-orders', {
    method: 'POST',
    body: {
      supplier_id: 1,
      destination_warehouse_id: 1,
      expected_delivery_date: '2026-11-20',
      notes: 'Test procurement batch',
      items: [
        { item_id: 1, quantity: 100, unit_price: 4.85 }
      ]
    }
  });
  assert.equal(createPoRes.status, 201);
  assert.equal(createPoRes.body.success, true);
  const po = createPoRes.body.data;
  assert.ok(po.id);
  assert.equal(po.total_amount, 485);

  // Receive PO (updates stock!)
  const receiveRes = await request(`/api/purchase-orders/${po.id}/receive`, {
    method: 'POST'
  });
  assert.equal(receiveRes.status, 200);
  assert.equal(receiveRes.body.data.status, 'RECEIVED');
  assert.equal(receiveRes.body.data.items[0].received_quantity, 100);
});

test('Module 4: Inter-Warehouse Stock Transfer lifecycle (CREATE, DISPATCH, RECEIVE)', async () => {
  // Create Transfer
  const createRes = await request('/api/transfers', {
    method: 'POST',
    body: {
      source_warehouse_id: 1,
      destination_warehouse_id: 2,
      notes: 'Test inter-warehouse replenishment',
      items: [
        { item_id: 2, quantity: 25 }
      ]
    }
  });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.success, true);
  const trf = createRes.body.data;
  assert.equal(trf.status, 'REQUESTED');

  // Dispatch Transfer
  const dispatchRes = await request(`/api/transfers/${trf.id}/dispatch`, {
    method: 'POST'
  });
  assert.equal(dispatchRes.status, 200);
  assert.equal(dispatchRes.body.data.status, 'DISPATCHED');
  assert.ok(dispatchRes.body.data.dispatched_at);

  // Receive Transfer
  const receiveRes = await request(`/api/transfers/${trf.id}/receive`, {
    method: 'POST'
  });
  assert.equal(receiveRes.status, 200);
  assert.equal(receiveRes.body.data.status, 'RECEIVED');
  assert.ok(receiveRes.body.data.received_at);
});

test('Module 4: Analytics FSN calculation and executive metrics', async () => {
  const metricsRes = await request('/api/analytics/metrics');
  assert.equal(metricsRes.status, 200);
  assert.ok(metricsRes.body.data.overview.total_valuation > 0);
  assert.ok(Array.isArray(metricsRes.body.data.warehouse_breakdown));
  assert.ok(Array.isArray(metricsRes.body.data.category_breakdown));

  const fsnRes = await request('/api/analytics/fsn');
  assert.equal(fsnRes.status, 200);
  assert.ok(Array.isArray(fsnRes.body.data));
  const hasFSN = fsnRes.body.data.some((item) => ['F', 'S', 'N'].includes(item.fsn_category));
  assert.ok(hasFSN);

  const csvRes = await request('/api/analytics/reports/export-csv');
  assert.equal(csvRes.status, 200);
  assert.ok(typeof csvRes.body === 'string');
  assert.ok(csvRes.body.includes('Warehouse,Code,SKU'));
});
