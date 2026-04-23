# Travyl

Travel planning application with collaborative itinerary building, real-time sync, and intelligent scheduling.

## Overview

Travyl helps travelers plan trips collaboratively. It features a drag-and-drop itinerary builder, real-time synchronization between users, and smart conflict detection for overlapping activities.

## Architecture

This is a TypeScript monorepo using npm workspaces:

```
apps/
  web/              # Next.js 16 web application
  mobile/           # Mobile app (placeholder)
packages/
  shared/           # Shared types, utilities, view models
services/           # AWS Lambda functions and business logic
```

## Tech Stack

**Web:** Next.js 16, React 19, Tailwind CSS 4, TypeScript 5
**State Management:** Yjs for real-time collaboration
**Backend:** AWS Lambda, DynamoDB, EventBridge, SST
**Testing:** Vitest
**Maps:** MapLibre GL, Leaflet
**UI:** Radix UI primitives, Framer Motion

## Getting Started

**Requirements:** Node.js 18+

```bash
# Install dependencies
npm install

# Run web app
npm run web

# Run mobile app
npm run mobile

# Type check all packages
npm run typecheck

# Lint all packages
npm run lint
```

## Testing

Tests are distributed across workspaces:

```bash
# Run web tests
npm -w @travyl/web test

# Run shared package tests
npm -w @travyl/shared test
```

Key test files:
- `services/lib/__tests__/conflictDetection.test.ts`
- `services/lib/__tests__/haversine.test.ts`
- `packages/shared/src/viewmodels/tripViewModel.test.ts`
- `packages/shared/src/utils/currency.test.ts`

## Environment Setup

The project uses SST for infrastructure management. AWS credentials must be configured for deployment.

## Features

- **Collaborative Planning:** Multiple users can edit the same trip simultaneously
- **Smart Scheduling:** Automatic conflict detection for overlapping activities
- **Exchange Rates:** Real-time currency conversion for international trips
- **Map Integration:** Visual trip planning with location markers and routing
- **Responsive Design:** Works on desktop and mobile devices

## License

Private - All rights reserved
