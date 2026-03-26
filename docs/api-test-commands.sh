#!/bin/bash
# API Test Commands for Travyl
# Run these to verify each service is working

# ══════════════════════════════════════════════════════════
# Build & Dev Commands
# ══════════════════════════════════════════════════════════

# npm run web                                    # Start Next.js dev server
# npm run mobile                                 # Start Expo dev server
# npm run typecheck                              # TypeScript check all workspaces
# npm run lint                                   # Lint all workspaces
# npx tsc --noEmit -p apps/web/tsconfig.json     # TypeScript check web only
# npx tsc --noEmit -p packages/shared/tsconfig.json  # TypeScript check shared
# npm -w @travyl/web run build                   # Production build (web)
# npx sst deploy --stage dev                     # Deploy SST backend

# ══════════════════════════════════════════════════════════
# Git Commands (push to RB24-7 only, NOT origin/TravylApp)
# ══════════════════════════════════════════════════════════

# git push personal develop                      # Push to RB24-7/travyl-web
# git fetch origin develop                       # Fetch from TravylApp org
# git remote -v                                  # Check remotes

# ══════════════════════════════════════════════════════════
# API Route Tests (requires dev server on localhost:3000)
# ══════════════════════════════════════════════════════════

echo "=== Places API (Python backend via proxy) ==="
curl -s 'http://localhost:3000/api/places?lat=48.8566&lng=2.3522&category=sightseeing&limit=3' | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d),'results'); [print(f'  {p[\"name\"]}') for p in d]"

echo ""
echo "=== Places API - Multiple categories ==="
for cat in sightseeing restaurant cafe museum park bar shopping nightlife beach; do
  count=$(curl -s "http://localhost:3000/api/places?lat=48.8566&lng=2.3522&category=$cat&limit=2" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
  echo "  $cat: $count"
done

echo ""
echo "=== Trip Planning API ==="
curl -s -X POST 'http://localhost:3000/api/trips/plan' \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"5 day romantic trip to Paris for 2 people"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('status:', d.get('status')); print('city:', d.get('extracted',{}).get('destination',{}).get('city','?'))"

echo ""
echo "=== Weather API (Visual Crossing) ==="
curl -s 'http://localhost:3000/api/weather?location=Tokyo,Japan&days=5' | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('current',{}); print('Current:', c.get('temp'), c.get('conditions')); print('Forecast:', len(d.get('forecast',[])),'days')"

echo ""
echo "=== Foursquare API (Hotels) ==="
curl -s 'http://localhost:3000/api/foursquare?lat=48.8566&lng=2.3522&category=hotel&limit=3' | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d),'hotels'); [print(f'  {v[\"name\"]}') for v in d]"

echo ""
echo "=== Foursquare API (Restaurants) ==="
curl -s 'http://localhost:3000/api/foursquare?lat=48.8566&lng=2.3522&category=restaurant&limit=3' | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d),'restaurants'); [print(f'  {v[\"name\"]}') for v in d]"

echo ""
echo "=== Directions API (GraphHopper) ==="
curl -s 'http://localhost:3000/api/directions?from=48.8566,2.3522&to=48.8606,2.3376&mode=foot' | python3 -c "import sys,json; d=json.load(sys.stdin); print('Distance:', d.get('distanceText')); print('Duration:', d.get('durationText')); print('Route points:', len(d.get('points',[])))"

echo ""
echo "=== News API (Google News RSS) ==="
curl -s 'http://localhost:3000/api/news?destination=Barcelona&limit=5' | python3 -c "import sys,json; articles=json.load(sys.stdin); print(len(articles),'articles'); [print(f'  [{a[\"category\"]}] {a[\"title\"][:60]}') for a in articles]"

echo ""
echo "=== Images API ==="
curl -s 'http://localhost:3000/api/images?q=Paris' | python3 -c "import sys,json; d=json.load(sys.stdin); print('URL:', d.get('url','?')[:80])"

echo ""
echo "=== Direct Backend Test (api.dev.gotravyl.com) ==="
curl -s "https://api.dev.gotravyl.com/api/places/nearby?lat=48.8566&lng=2.3522&category=sightseeing&limit=2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d),'results from backend'); [print(f'  {p[\"name\"]}') for p in d]"

echo ""
echo "=== Visual Crossing Direct ==="
curl -s "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/Paris,France/today?unitGroup=metric&key=\$VISUAL_CROSSING_API_KEY&contentType=json" | python3 -c "import sys,json; d=json.load(sys.stdin); day=d['days'][0]; print('Paris today:', day['tempmax'],'/',day['tempmin'],'°C', day['conditions'])"

echo ""
echo "=== GraphHopper Direct ==="
curl -s "https://graphhopper.com/api/1/route?point=48.8566,2.3522&point=48.8606,2.3376&vehicle=foot&locale=en&key=\$GRAPHHOPPER_API_KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); p=d['paths'][0]; print('Distance:', round(p['distance']),'m', 'Time:', round(p['time']/60000),'min')"
