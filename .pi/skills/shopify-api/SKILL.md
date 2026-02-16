---
name: shopify-api
description: Interact with Shopify Admin API. Use for checking sales, inventory, orders, products, and customers on Shopify.
---

# Shopify Admin API Skill

Query Shopify store data using the Admin API.

## Prerequisites

Requires these secrets in LLM_SECRETS:
- `SHOPIFY_STORE_URL` — Your Shopify store domain (e.g., your-store.myshopify.com)
- `SHOPIFY_ACCESS_TOKEN` — Admin API access token

Check available secrets:
```bash
/job/.pi/skills/llm-secrets/llm-secrets.js
```

## Usage

```bash
# Get sales data (last N days)
/job/.pi/skills/shopify-api/shopify.js sales --days 7

# Get inventory for all products
/job/.pi/skills/shopify-api/shopify.js inventory

# Get orders by status
/job/.pi/skills/shopify-api/shopify.js orders --status open

# Get order details
/job/.pi/skills/shopify-api/shopify.js orders --id ORDER_ID

# Get product list
/job/.pi/skills/shopify-api/shopify.js products
```

## Commands

| Command | Description |
|---------|-------------|
| `sales --days N` | Sales/revenue summary for the last N days |
| `inventory` | Inventory levels for all products/variants |
| `orders --status STATUS` | Orders by status (open, closed, cancelled, any) |
| `orders --id ID` | Details for a specific order |
| `products` | List all products with variants |
