#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Website Builder — One-command deploy script
# Run from the project root: bash deploy.sh
# ─────────────────────────────────────────────────────────────
set -e

ACCOUNT_ID="4d71ca02a65fe3fe95081fcc37a70e2a"
DB_ID="743ab514-0f5c-4f7a-a661-b7db86fec085"
WORKER_NAME="website-builder"

echo "🏗  Website Builder — Deploy"
echo "Account: $ACCOUNT_ID"
echo ""

# ── 1. Check wrangler auth ────────────────────────────────────
echo "▸ Checking Wrangler authentication..."
if ! npx wrangler whoami &>/dev/null; then
  echo "  Not logged in. Running: npx wrangler login"
  npx wrangler login
fi
echo "  ✓ Authenticated"

# ── 2. Deploy the Worker API ──────────────────────────────────
echo ""
echo "▸ Deploying Worker API..."
cd worker
npm install --silent
npx wrangler deploy --name "$WORKER_NAME"
echo "  ✓ Worker deployed → https://$WORKER_NAME.$( npx wrangler whoami 2>/dev/null | grep subdomain | awk '{print $2}' ).workers.dev"
cd ..

# ── 3. Verify DB tables exist ─────────────────────────────────
echo ""
echo "▸ Verifying D1 schema..."
TABLE_COUNT=$(npx wrangler d1 execute "$DB_ID" \
  --command "SELECT COUNT(*) as n FROM sqlite_master WHERE type='table';" \
  --json 2>/dev/null | python3 -c "import sys,json; data=json.load(sys.stdin); print(data[0]['results'][0]['n'])" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -lt 5 ] 2>/dev/null; then
  echo "  Running schema migrations..."
  npx wrangler d1 execute "$DB_ID" --file=worker/schema.sql --remote
  echo "  ✓ Schema applied"
else
  echo "  ✓ Schema OK ($TABLE_COUNT tables found)"
fi

# ── 4. Build + deploy the Editor (Cloudflare Pages) ───────────
echo ""
echo "▸ Building Editor SPA..."
cd editor
npm install --silent

# Set API URL to deployed worker
WORKER_URL="https://${WORKER_NAME}.workers.dev"
echo "VITE_API_URL=$WORKER_URL" > .env.production

npm run build
echo "  ✓ Build complete (dist/)"

echo ""
echo "▸ Deploying Editor to Cloudflare Pages..."
npx wrangler pages deploy dist \
  --project-name "website-builder-editor" \
  --branch main
cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅  Deploy complete!"
echo ""
echo "  API Worker:  https://${WORKER_NAME}.workers.dev"
echo "  Editor:      https://website-builder-editor.pages.dev"
echo "  Published sites: https://${WORKER_NAME}.workers.dev/sites/{slug}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
