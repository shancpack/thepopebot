Job: Pull Sutera Amazon Inventory & Sales Performance Analysis via SP-API

Create a comprehensive script to connect to Amazon's Selling Partner API and analyze Sutera product performance. The job will:

**Inventory Analysis:**
1. Authenticate with Amazon SP-API using provided credentials
2. Call the FBA Inventory API to get current inventory quantities
3. Retrieve product details (ASIN, SKU, title, condition, price)
4. Pull available quantities, inbound quantities, and reserved quantities
5. Identify low-stock items (configurable threshold)

**Sales Performance Analysis:**
6. Use SP-API Sales and Traffic reports to get sales data for past 2 weeks
7. Calculate daily average units sold per product
8. Estimate daily revenue based on current pricing
9. Identify top-performing products by units and revenue
10. Calculate sales velocity and days of inventory remaining
11. Flag fast-moving products that may need restocking soon

**Output & Reporting:**
12. Export comprehensive data to CSV with columns: ASIN, SKU, Product Title, Current Inventory, Daily Units Sold, Daily Revenue Estimate, Sales Rank, Days of Supply, Restock Priority
13. Generate executive summary with top 10 best sellers and inventory alerts
14. Save all results to cloud storage with timestamp
15. Include data visualization charts for sales trends

The script will handle API rate limits, error handling, and provide actionable insights for inventory management decisions.
