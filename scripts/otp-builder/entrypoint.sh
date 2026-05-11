#!/bin/bash
set -e

GRAPH_DIR="/var/otp/graphs"
mkdir -p "$GRAPH_DIR"

echo "[otp-builder] Starting graph build at $(date)"

# ── Download OSM data ──────────────────────────────────────
if [ -n "$OSM_URL" ]; then
  echo "[otp-builder] Downloading OSM: $OSM_URL"
  curl -fL -o "$GRAPH_DIR/region.osm.pbf" "$OSM_URL"
  echo "[otp-builder] OSM download complete"
else
  echo "[otp-builder] No OSM_URL set, skipping OSM download"
fi

# ── Download GTFS feeds ────────────────────────────────────
if [ -n "$GTFS_URLS" ]; then
  IFS=',' read -ra GTFS_FEEDS <<< "$GTFS_URLS"
  idx=1
  for url in "${GTFS_FEEDS[@]}"; do
    url="$(echo "$url" | xargs)"  # trim whitespace
    if [ -z "$url" ]; then continue; fi
    echo "[otp-builder] Downloading GTFS #$idx: $url"
    curl -fL -o "/tmp/gtfs-$idx.zip" "$url"
    # Unzip into a subdirectory so OTP can discover multiple feeds
    mkdir -p "$GRAPH_DIR/gtfs-$idx"
    unzip -o "/tmp/gtfs-$idx.zip" -d "$GRAPH_DIR/gtfs-$idx"
    rm "/tmp/gtfs-$idx.zip"
    echo "[otp-builder] GTFS #$idx download complete"
    idx=$((idx + 1))
  done
else
  echo "[otp-builder] No GTFS_URLS set, skipping GTFS download"
fi

# ── Build graph ────────────────────────────────────────────
echo "[otp-builder] Building graph..."
exec java $JAVA_OPTS -jar /opentripplanner.jar --build "$GRAPH_DIR" --save
