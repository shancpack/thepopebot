Investigate missing Shopify credentials file issue. The job should:

1. Search the entire repository for any files containing "shopify" (case-insensitive) including credentials, config files, or environment files
2. Check the .gitignore file to see if any Shopify-related files were recently added to it
3. Look at recent Git commits and changes to see if Shopify credentials files were moved, renamed, or gitignored
4. Check common credential storage locations like:
   - .env files
   - config/ directory
   - credentials/ directory  
   - Any hidden files or directories
5. Review the Claude code setup to understand what credentials file it's expecting and where
6. Provide recommendations for restoring access to the credentials
7. Check if there are any backup copies of the credentials file

The job should identify exactly what happened to the Shopify credentials and provide a solution to restore access.