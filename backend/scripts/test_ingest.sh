#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${FIRECRAWL_API_KEY:-}" ]]; then
  echo "FIRECRAWL_API_KEY is not set"
  exit 1
fi

API_URL="${API_URL:-http://localhost:8080/ingest}"
TEST_URL="${TEST_URL:-https://example.com}"

curl -sS -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$TEST_URL\"}"

echo ""
