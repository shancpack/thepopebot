#!/usr/bin/env node

/**
 * shopify.js - Shopify Admin API client for thepopebot
 *
 * Usage:
 *   shopify.js sales --days 7
 *   shopify.js inventory
 *   shopify.js orders --status open
 *   shopify.js orders --id ORDER_ID
 *   shopify.js products
 *
 * Requires LLM_SECRETS: SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN
 */

const https = require('https');
const { URL } = require('url');

// --- Config ---
const STORE_URL = process.env.SHOPIFY_STORE_URL; // e.g., your-store.myshopify.com
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2024-10';

// --- Helpers ---
function shopifyRequest(endpoint, method = 'GET') {
  if (!STORE_URL || !ACCESS_TOKEN) {
    console.error('Missing Shopify credentials. Check LLM_SECRETS.');
    console.error('Required: SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN');
    process.exit(1);
  }

  const url = `https://${STORE_URL}/admin/api/${API_VERSION}${endpoint}`;
  const parsed = new URL(url);

  return new Promise((resolve, reject) => {
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// --- Commands ---
async function getSales(days) {
  const now = new Date();
  const start = new Date(now - days * 86400000);
  const res = await shopifyRequest(
    `/orders.json?status=any&created_at_min=${start.toISOString()}&limit=250`
  );

  if (res.status === 200 && res.data.orders) {
    const orders = res.data.orders;
    console.log(`\nShopify Sales - Last ${days} Days\n${'='.repeat(40)}`);

    let totalRevenue = 0;
    let totalOrders = 0;
    const dailySales = {};

    for (const o of orders) {
      if (o.financial_status === 'refunded' || o.cancelled_at) continue;
      const date = new Date(o.created_at).toISOString().split('T')[0];
      const amount = parseFloat(o.total_price || 0);
      totalRevenue += amount;
      totalOrders++;
      dailySales[date] = (dailySales[date] || 0) + amount;
    }

    const sortedDates = Object.keys(dailySales).sort();
    for (const date of sortedDates) {
      console.log(`  ${date}: $${dailySales[date].toFixed(2)}`);
    }
    console.log(`${'='.repeat(40)}`);
    console.log(`  Total: ${totalOrders} orders, $${totalRevenue.toFixed(2)}`);
    console.log(`  Avg/Day: ${(totalOrders / days).toFixed(1)} orders, $${(totalRevenue / days).toFixed(2)}`);
  } else {
    console.log('Sales API response:', JSON.stringify(res.data, null, 2));
  }
}

async function getInventory() {
  const res = await shopifyRequest('/products.json?limit=250');

  if (res.status === 200 && res.data.products) {
    console.log(`\nShopify Inventory\n${'='.repeat(60)}`);
    const products = res.data.products;

    if (products.length === 0) {
      console.log('  No products found.');
      return;
    }

    for (const p of products) {
      console.log(`\n  ${p.title} (${p.status})`);
      for (const v of p.variants || []) {
        const qty = v.inventory_quantity || 0;
        const alert = qty < 50 ? ' ⚠️ LOW STOCK' : '';
        const sku = v.sku || 'no-sku';
        console.log(`    ${sku}: ${qty} available | $${v.price}${alert}`);
      }
    }
  } else {
    console.log('Inventory API response:', JSON.stringify(res.data, null, 2));
  }
}

async function getOrders(status, orderId) {
  if (orderId) {
    const res = await shopifyRequest(`/orders/${orderId}.json`);
    console.log(JSON.stringify(res.data, null, 2));
    return;
  }

  const statusParam = status || 'open';
  const res = await shopifyRequest(`/orders.json?status=${statusParam}&limit=50`);

  if (res.status === 200 && res.data.orders) {
    const orders = res.data.orders;
    console.log(`\nShopify Orders (${statusParam})\n${'='.repeat(50)}`);
    console.log(`  Total: ${orders.length} orders`);

    for (const o of orders.slice(0, 20)) {
      const date = new Date(o.created_at).toLocaleDateString();
      const total = `$${o.total_price}`;
      const fulfillment = o.fulfillment_status || 'unfulfilled';
      console.log(`  #${o.order_number} | ${date} | ${o.financial_status} | ${fulfillment} | ${total}`);
    }
    if (orders.length > 20) console.log(`  ... and ${orders.length - 20} more`);
  } else {
    console.log('Orders API response:', JSON.stringify(res.data, null, 2));
  }
}

async function getProducts() {
  const res = await shopifyRequest('/products.json?limit=250');

  if (res.status === 200 && res.data.products) {
    const products = res.data.products;
    console.log(`\nShopify Products\n${'='.repeat(50)}`);
    console.log(`  Total: ${products.length} products\n`);

    for (const p of products) {
      console.log(`  ${p.title} (${p.status})`);
      console.log(`    Type: ${p.product_type || 'N/A'} | Vendor: ${p.vendor || 'N/A'}`);
      for (const v of p.variants || []) {
        console.log(`    - ${v.title}: $${v.price} | SKU: ${v.sku || 'N/A'} | Stock: ${v.inventory_quantity}`);
      }
      console.log('');
    }
  } else {
    console.log('Products API response:', JSON.stringify(res.data, null, 2));
  }
}

// --- CLI ---
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('Usage: shopify.js <command> [options]');
    console.log('Commands: sales, inventory, orders, products');
    process.exit(0);
  }

  const getFlag = (name) => {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 ? args[idx + 1] : null;
  };

  switch (command) {
    case 'sales':
      await getSales(parseInt(getFlag('days') || '1'));
      break;
    case 'inventory':
      await getInventory();
      break;
    case 'orders':
      await getOrders(getFlag('status'), getFlag('id'));
      break;
    case 'products':
      await getProducts();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
