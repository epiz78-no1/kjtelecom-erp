#!/bin/bash

# Pre-deployment check script
# This script verifies that DEV and PROD databases have identical schemas

set -e

echo "🚀 Pre-Deployment Check Starting..."
echo ""

# Check if DATABASE_URL_PROD is set
if [ -z "$DATABASE_URL_PROD" ]; then
  echo "❌ ERROR: DATABASE_URL_PROD environment variable not set"
  echo ""
  echo "Please set it with:"
  echo "  export DATABASE_URL_PROD='your-production-database-url'"
  echo ""
  exit 1
fi

# Run schema verification
echo "Running DB schema verification..."
npx tsx scripts/verify-db-schema.ts

# If we get here, schema check passed
echo ""
echo "✅ All pre-deployment checks passed!"
echo "🚀 You can now safely deploy to production"
echo ""
