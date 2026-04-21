#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# MedTriage — Full GCP + Firebase Deployment Script
#
# This script performs the COMPLETE deployment sequence:
#   1. Authenticate with GCP and Firebase
#   2. Create a new GCP project
#   3. Link the GCP project to Firebase
#   4. Deploy the FastAPI backend to App Engine (with GEMINI_API_KEY injection)
#   5. Deploy the Next.js frontend to Firebase Hosting
#
# PREREQUISITES:
#   - Google Cloud SDK (gcloud) installed: https://cloud.google.com/sdk/docs/install
#   - Firebase CLI installed: npm install -g firebase-tools
#   - A GCP billing account linked to your Google account
#   - A .env file in backend/ with GEMINI_API_KEY=your_key
#
# USAGE:
#   chmod +x deploy_commands.sh
#   ./deploy_commands.sh
#
# NOTE: Update the variables below before running.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION — UPDATE THESE BEFORE RUNNING
# ═══════════════════════════════════════════════════════════════════════════

PROJECT_ID="medtriage-hackovium"       # Must be globally unique
PROJECT_NAME="MedTriage Hackovium"
REGION="us-central1"                   # App Engine & Firebase region
BILLING_ACCOUNT_ID=""                  # Run: gcloud billing accounts list

# Load GEMINI_API_KEY from backend/.env
if [ -f "backend/.env" ]; then
  export $(grep -v '^#' backend/.env | xargs)
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "ERROR: GEMINI_API_KEY not found in backend/.env"
  exit 1
fi

echo "═══════════════════════════════════════════════════════════════"
echo "  MedTriage — Deployment Pipeline"
echo "  Project: ${PROJECT_ID}"
echo "  Region:  ${REGION}"
echo "═══════════════════════════════════════════════════════════════"

# ─────────────────────────────────────────────────────────────────────────
# STEP 1: Authenticate
# ─────────────────────────────────────────────────────────────────────────

echo ""
echo "[1/8] Authenticating with Google Cloud..."
gcloud auth login --brief
gcloud auth application-default login

echo ""
echo "[2/8] Authenticating with Firebase..."
firebase login

# ─────────────────────────────────────────────────────────────────────────
# STEP 2: Create GCP Project
# ─────────────────────────────────────────────────────────────────────────

echo ""
echo "[3/8] Creating GCP project: ${PROJECT_ID}..."
gcloud projects create "${PROJECT_ID}" \
  --name="${PROJECT_NAME}" \
  --set-as-default \
  || echo "    Project may already exist, continuing..."

gcloud config set project "${PROJECT_ID}"

# Link billing (required for App Engine)
if [ -n "${BILLING_ACCOUNT_ID}" ]; then
  echo "    Linking billing account..."
  gcloud billing projects link "${PROJECT_ID}" \
    --billing-account="${BILLING_ACCOUNT_ID}"
else
  echo "    WARNING: No billing account set. Set BILLING_ACCOUNT_ID and re-run,"
  echo "    or link billing manually: https://console.cloud.google.com/billing"
fi

# ─────────────────────────────────────────────────────────────────────────
# STEP 3: Link GCP Project to Firebase
# ─────────────────────────────────────────────────────────────────────────

echo ""
echo "[4/8] Adding Firebase to GCP project..."
firebase projects:addfirebase "${PROJECT_ID}" \
  || echo "    Firebase may already be linked, continuing..."

# Enable Firebase Auth and Storage
echo "    Enabling Firebase services..."
gcloud services enable \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  identitytoolkit.googleapis.com \
  firebasestorage.googleapis.com \
  --project="${PROJECT_ID}"

# ─────────────────────────────────────────────────────────────────────────
# STEP 4: Deploy Backend to App Engine
# ─────────────────────────────────────────────────────────────────────────

echo ""
echo "[5/8] Enabling App Engine..."
gcloud app create --region="${REGION}" --project="${PROJECT_ID}" \
  || echo "    App Engine may already be initialized, continuing..."

echo ""
echo "[6/8] Deploying FastAPI backend to App Engine..."
echo "    Injecting GEMINI_API_KEY securely via --set-env-vars..."

cd backend
gcloud app deploy app.yaml \
  --project="${PROJECT_ID}" \
  --set-env-vars="GEMINI_API_KEY=${GEMINI_API_KEY}" \
  --quiet \
  --promote

BACKEND_URL="https://${PROJECT_ID}.${REGION}.r.appspot.com"
echo "    Backend deployed at: ${BACKEND_URL}"
cd ..

# ─────────────────────────────────────────────────────────────────────────
# STEP 5: Deploy Frontend to Firebase Hosting
# ─────────────────────────────────────────────────────────────────────────

echo ""
echo "[7/8] Building and deploying frontend to Firebase Hosting..."

cd frontend

# Update .firebaserc with the correct project ID
cat > .firebaserc << EOF
{
  "projects": {
    "default": "${PROJECT_ID}"
  }
}
EOF

# Set production API URL
echo "NEXT_PUBLIC_API_URL=${BACKEND_URL}" > .env.production.local

firebase use "${PROJECT_ID}"
firebase deploy --only hosting,storage --project="${PROJECT_ID}"

FRONTEND_URL=$(firebase hosting:channel:list --project="${PROJECT_ID}" 2>/dev/null | head -5 || echo "https://${PROJECT_ID}.web.app")
cd ..

# ─────────────────────────────────────────────────────────────────────────
# STEP 6: Update Backend CORS for Production
# ─────────────────────────────────────────────────────────────────────────

echo ""
echo "[8/8] Deployment complete!"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  DEPLOYMENT SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Backend (App Engine):   ${BACKEND_URL}"
echo "  Frontend (Firebase):    https://${PROJECT_ID}.web.app"
echo ""
echo "  IMPORTANT POST-DEPLOY STEPS:"
echo "  1. Update CORS in backend/main.py to include:"
echo "     https://${PROJECT_ID}.web.app"
echo "  2. Enable Google Sign-In in Firebase Console:"
echo "     https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers"
echo "  3. Set up Firebase Storage bucket in Console:"
echo "     https://console.firebase.google.com/project/${PROJECT_ID}/storage"
echo "  4. Add Firebase web app config to frontend/.env.production.local"
echo ""
echo "═══════════════════════════════════════════════════════════════"
