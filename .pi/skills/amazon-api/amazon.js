#!/usr/bin/env node

/**
 * amazon.js - Amazon SP-API client for thepopebot
 *
 * Usage:
 *   amazon.js sales --days 7
 *   amazon.js inventory
 *   amazon.js orders --status Pending
 *   amazon.js orders --id ORDER_ID
 *   amazon.js catalog --asin ASIN
 *
 * Requires LLM_SECRETS: AMAZON_SP_CLIENT_ID, AMAZON_SP_CLIENT_SECRET,
 *   AMAZON_SP_REFRESH_TOKEN, AMAZON_MARKETPLACE_ID, AMAZON_SELLER_ID
 */

const https = require('https');
const { URL } = require('url');

// --- Config ---
const CLIENT_ID = process.env.AMAZON_SP_CLIENT_ID || process.env.AMAZON_CLIENT_ID;
const CLIENT_SECRET = process.env.AMAZON_SP_CLIENT_SECRET || process.env.AMAZON_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.AMAZON_SP_REFRESH_TOKEN || process.env.AMAZON_REFRESH_TOKEN;
const MARKETPLACE_ID = process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER';
const SELLER_ID = process.env.AMAZON_SELLER_ID;
const SP_API_BASE = 'https://sellingpartnerapi-na.amazon.com';

// --- Helpers ---
function httpRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
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
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error('Missing Amazon SP-API credentials. Check LLM_SECRETS.');
    console.error('Required: AMAZON_SP_CLIENT_ID, AMAZON_SP_CLIENT_SECRET, AMAZON_SP_REFRESH_TOKEN');
    process.exit(1);
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: REFRESH_TOKEN,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  }).toString();

  const res = await httpRequest('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }, body);

  if (res.data.access_token) return res.data.access_token;
  console.error('Failed to get access token:', JSON.stringify(res.data));
  process.exit(1);
}

async function spApiRequest(path, token) {
  const url = `${SP_API_BASE}${path}`;
  return httpRequest(url, {
    headers: {
      'x-amz-access-token': token,
      'Content-Type': 'application/json',
    },
  });
}

// --- Commands ---
async function getSales(days) {
  const token = await getAccessToken();
  const now = new Date();
  const start = new Date(now - days * 86400000);
  const interval = `${start.toISOString().split('.')[0]}Z--${now.toISOString().split('.')[0]}Z`;
  const path = `/sales/v1/orderMetrics?marketplaceIds=${MARKETPLACE_ID}&interval=${encodeURIComponent(interval)}&granularity=Day`;
  const res = await spApiRequest(path, token);
  
  if (res.status === 200 && res.data.payload) {
    console.log(`\nAmazon Sales - Last ${days} Days\n${'='.repeat(40)}`);
    let totalUnits = 0, totalRevenue = 0;
    for (const m of res.data.payload) {
      const date = m.interval.split('T')[0];
      const units = m.unitCount || 0;
      const revenue = parseFloat(m.totalSales?.amount || 0);
      totalUnits += units;
      totalRevenue += revenue;
      console.log(`  ${date}: ${units} units, $${revenue.toFixed(2)}`);
    }
    console.log(`${'='.repeat(40)}`);
    console.log(`  Total: ${totalUnits} units, $${totalRevenue.toFixed(2)}`);
    console.log(`  Avg/Day: ${(totalUnits / days).toFixed(1)} units, $${(totalRevenue / days).toFixed(2)}`);
  } else {
    console.log('Sales API response:', JSON.stringify(res.data, null, 2));
  }
}

async function getInventory() {
  const token = await getAccessToken();
  const path = `/fba/inventory/v1/summaries?details=true&granularityType=Marketplace&granularityId=${MARKETPLACE_ID}&marketplaceIds=${MARKETPLACE_ID}`;
  const res = await spApiRequest(path, token);
  
  if (res.status === 200 && res.data.payload) {
    console.log(`\nAmazon FBA Inventory\n${'='.repeat(60)}`);
    const items = res.data.payload.inventorySummaries || [];
    if (items.length === 0) {
      console.log('  No inventory items found.');
    }
    for (const item of items) {
      const qty = item.inventoryDetails?.fulfillableQuantity || 0;
      const inbound = item.inventoryDetails?.inboundWorkingQuantity || 0;
      const alert = qty < 50 ? ' ⚠️ LOW STOCK' : '';
      console.log(`  ${item.sellerSku || item.asin}: ${qty} available, ${inbound} inbound${alert}`);
      if (item.productName) console.log(`    → ${item.productName}`);
    }
  } else {
    console.log('Inventory API response:', JSON.stringify(res.data, null, 2));
  }
}

async function getOrders(status, orderId) {
  const token = await getAccessToken();
  
  if (orderId) {
    const path = `/orders/v0/orders/${orderId}`;
    const res = await spApiRequest(path, token);
    console.log(JSON.stringify(res.data, null, 2));
    return;
  }

  const now = new Date();
  const start = new Date(now - 7 * 86400000);
  let path = `/orders/v0/orders?MarketplaceIds=${MARKETPLACE_ID}&CreatedAfter=${start.toISOString()}`;
  if (status) path += `&OrderStatuses=${status}`;
  
  const res = await spApiRequest(path, token);
  
  if (res.status === 200 && res.data.payload) {
    const orders = res.data.payload.Orders || [];
    console.log(`\nAmazon Orders${status ? ` (${status})` : ''} - Last 7 Days\n${'='.repeat(50)}`);
    console.log(`  Total: ${orders.length} orders`);
    for (const o of orders.slice(0, 20)) {
      const date = new Date(o.PurchaseDate).toLocaleDateString();
      const total = o.OrderTotal ? `$${o.OrderTotal.Amount}` : 'N/A';
      console.log(`  ${o.AmazonOrderId} | ${date} | ${o.OrderStatus} | ${total}`);
    }
    if (orders.length > 20) console.log(`  ... and ${orders.length - 20} more`);
  } else {
    console.log('Orders API response:', JSON.stringify(res.data, null, 2));
  }
}

async function getCatalog(asin) {
  const token = await getAccessToken();
  const path = `/catalog/2022-04-01/items/${asin}?marketplaceIds=${MARKETPLACE_ID}&includedData=summaries,attributes,images`;
  const res = await spApiRequest(path, token);
  console.log(JSON.stringify(res.data, null, 2));
}

// --- CLI ---
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('Usage: amazon.js <command> [options]');
    console.log('Commands: sales, inventory, orders, catalog');
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
    case 'catalog':
      await getCatalog(getFlag('asin'));
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
