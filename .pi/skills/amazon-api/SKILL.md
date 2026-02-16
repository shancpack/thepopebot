---
name: amazon-api
description: Interact with Amazon Seller Central via the SP-API. Use for checking sales, inventory, orders, and product data on Amazon.
---

# Amazon SP-API Skill

Query Amazon Seller Central data using the SP-API.

## Prerequisites

Requires these secrets in LLM_SECRETS:
- `AMAZON_SP_CLIENT_ID` — SP-API app client ID
- `AMAZON_SP_CLIENT_SECRET` — SP-API app client secret
- `AMAZON_SP_REFRESH_TOKEN` — LWA refresh token
- `AMAZON_MARKETPLACE_ID` — Marketplace ID (US = ATVPDKIKX0DER)
- `AMAZON_SELLER_ID` — Your seller/merchant ID

Check available secrets:
```bash
/job/.pi/skills/llm-secrets/llm-secrets.js
```

## Usage

```bash
# Get sales data (last N days)
/job/.pi/skills/amazon-api/amazon.js sales --days 7

# Get inventory summary
/job/.pi/skills/amazon-api/amazon.js inventory

# Get orders by status
/job/.pi/skills/amazon-api/amazon.js orders --status Pending

# Get order details
/job/.pi/skills/amazon-api/amazon.js orders --id ORDER_ID

# Get product catalog info
/job/.pi/skills/amazon-api/amazon.js catalog --asin B0XXXXXXXX
```

## Commands

| Command | Description |
|---------|-------------|
| `sales --days N` | Sales summary for the last N days |
| `inventory` | FBA inventory levels for all SKUs |
| `orders --status STATUS` | Orders filtered by status (Pending, Shipped, Canceled, etc.) |
| `orders --id ID` | Details for a specific order |
| `catalog --asin ASIN` | Product catalog info by ASIN |
