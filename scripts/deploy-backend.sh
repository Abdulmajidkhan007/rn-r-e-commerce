#!/usr/bin/env bash
#
# Deploys the Firebase backend in the order the pieces depend on each other, and
# refuses to continue when a step fails — a half-deployed backend is worse than
# an undeployed one.
#
#   ./scripts/deploy-backend.sh <project-id>
#
# Prerequisites (all yours, none can be done from a sandbox):
#   - firebase login
#   - GOOGLE_APPLICATION_CREDENTIALS pointing at a service-account key, for the
#     token backfill only
#   - PAYME_MERCHANT_KEY / CLICK_SECRET_KEY set as secrets, if you use the
#     gateways: firebase functions:secrets:set PAYME_MERCHANT_KEY
set -euo pipefail

PROJECT="${1:-}"
if [[ -z "$PROJECT" ]]; then
  echo "usage: $0 <firebase-project-id>" >&2
  exit 1
fi

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

step "Verifying the build before touching production"
npm run type-check
npm run lint
npm test

step "1/4 Firestore indexes"
# First: the catalog queries fail outright until these exist, and index builds
# are asynchronous — starting them early means less waiting later.
firebase deploy --only firestore:indexes --project "$PROJECT"

step "2/4 Security rules (Firestore + Storage)"
# Before Functions: rules are the authorization boundary, and until they are
# live the database is open.
firebase deploy --only firestore:rules,storage --project "$PROJECT"

step "3/4 Cloud Functions"
(cd functions && npm ci && npm run build)
firebase deploy --only functions --project "$PROJECT"

step "4/4 Search-token backfill"
if [[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
  echo "GOOGLE_APPLICATION_CREDENTIALS is not set — skipping the backfill."
  echo "Products written before server-side search stay invisible to search"
  echo "(still browsable by category) until you run:"
  echo "  GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json \\"
  echo "    node scripts/backfill-search-tokens.ts"
else
  echo "Dry run first:"
  node scripts/backfill-search-tokens.ts --dry-run
  read -r -p "Apply these updates? [y/N] " reply
  if [[ "$reply" =~ ^[Yy]$ ]]; then
    node scripts/backfill-search-tokens.ts
  else
    echo "Skipped."
  fi
fi

step "Done"
cat <<'EOF'
Deployed. Remaining steps that cannot be scripted, because they happen in
someone else's console:

  - Register the webhook URLs in the Payme and Click merchant cabinets:
      https://<region>-<project>.cloudfunctions.net/paymeWebhook
      https://<region>-<project>.cloudfunctions.net/clickWebhook
    (firebase deploy printed the exact URLs above.)
  - Grant yourself admin:
      GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json \
        node scripts/set-admin-claim.ts <uid>
    then sign out and back in to refresh the token.
  - Watch the index build finish in the Firebase console; queries using a
    still-building index fail rather than degrade.
EOF
