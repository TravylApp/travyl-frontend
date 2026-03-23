#!/bin/bash
# Post-build script that transforms Next.js standalone output into
# Amplify's .amplify-hosting deployment specification format.
# This bypasses Amplify's built-in Next.js adapter which doesn't
# properly support Next.js 15 in monorepo setups.

set -euo pipefail

echo "Creating .amplify-hosting deployment structure..."

# Clean previous output
rm -rf .amplify-hosting

# Create directory structure
mkdir -p .amplify-hosting/compute/default
mkdir -p .amplify-hosting/static

# Copy the standalone server (monorepo structure: .next/standalone/apps/web/)
cp -r .next/standalone/apps/web/. .amplify-hosting/compute/default/

# Copy root-level node_modules from standalone (monorepo hoisted deps)
if [ -d ".next/standalone/node_modules" ]; then
  cp -r .next/standalone/node_modules .amplify-hosting/compute/default/node_modules_root
  # Merge with app-level node_modules
  if [ -d ".amplify-hosting/compute/default/node_modules" ]; then
    cp -rn .next/standalone/node_modules/* .amplify-hosting/compute/default/node_modules/ 2>/dev/null || true
  else
    mv .amplify-hosting/compute/default/node_modules_root .amplify-hosting/compute/default/node_modules
  fi
  rm -rf .amplify-hosting/compute/default/node_modules_root
fi

# Copy static assets — these are served from CDN
mkdir -p .amplify-hosting/static/_next
cp -r .next/static .amplify-hosting/static/_next/static

# Copy public directory if it exists
if [ -d "public" ]; then
  cp -r public/* .amplify-hosting/static/ 2>/dev/null || true
fi

# The compute server needs .next with server chunks
mkdir -p .amplify-hosting/compute/default/.next
cp -r .next/server .amplify-hosting/compute/default/.next/server
cp .next/BUILD_ID .amplify-hosting/compute/default/.next/BUILD_ID
cp .next/prerender-manifest.json .amplify-hosting/compute/default/.next/prerender-manifest.json 2>/dev/null || true
cp .next/routes-manifest.json .amplify-hosting/compute/default/.next/routes-manifest.json 2>/dev/null || true
cp .next/build-manifest.json .amplify-hosting/compute/default/.next/build-manifest.json 2>/dev/null || true
cp .next/app-build-manifest.json .amplify-hosting/compute/default/.next/app-build-manifest.json 2>/dev/null || true
cp .next/app-path-routes-manifest.json .amplify-hosting/compute/default/.next/app-path-routes-manifest.json 2>/dev/null || true
cp .next/react-loadable-manifest.json .amplify-hosting/compute/default/.next/react-loadable-manifest.json 2>/dev/null || true
cp .next/required-server-files.json .amplify-hosting/compute/default/.next/required-server-files.json 2>/dev/null || true
cp .next/required-server-files.json .amplify-hosting/compute/default/required-server-files.json 2>/dev/null || true
cp .next/package.json .amplify-hosting/compute/default/.next/package.json 2>/dev/null || true

# Generate deploy-manifest.json
NEXT_VERSION=$(node -e "console.log(require('next/package.json').version)")

cat > .amplify-hosting/deploy-manifest.json << MANIFEST
{
  "version": 1,
  "routes": [
    {
      "path": "/_next/static/*",
      "target": {
        "kind": "Static",
        "cacheControl": "public, max-age=31536000, immutable"
      }
    },
    {
      "path": "/*.*",
      "target": {
        "kind": "Static"
      },
      "fallback": {
        "kind": "Compute",
        "src": "default"
      }
    },
    {
      "path": "/*",
      "target": {
        "kind": "Compute",
        "src": "default"
      }
    }
  ],
  "computeResources": [
    {
      "name": "default",
      "runtime": "nodejs20.x",
      "entrypoint": "server.js"
    }
  ],
  "imageSettings": {
    "sizes": [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    "domains": [],
    "remotePatterns": [
      {
        "protocol": "https",
        "hostname": "images.unsplash.com"
      }
    ],
    "formats": ["image/webp"],
    "minimumCacheTTL": 60,
    "dangerouslyAllowSVG": false
  },
  "framework": {
    "name": "next",
    "version": "${NEXT_VERSION}"
  }
}
MANIFEST

echo "Amplify deployment structure created successfully"
echo "  Compute: .amplify-hosting/compute/default/"
echo "  Static:  .amplify-hosting/static/"
echo "  Manifest: .amplify-hosting/deploy-manifest.json"
