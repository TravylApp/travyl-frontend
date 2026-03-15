# Installation Guide

Follow these steps to set up the Travyl project for local development.

## Prerequisites

- **Node.js**: Version 22 (LTS) is required.
- **Python 3.x**: Required for generating presentation materials.
- **Expo Go** (Optional): For testing the mobile app on a physical device.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd travyl
    ```

2.  **Install dependencies:**
    Run the following command in the root directory:
    ```bash
    npm install
    ```

## Development

The project is structured as a monorepo using npm Workspaces.

### Web Application (Next.js)

To start the web application in development mode:
```bash
npm run web
```
The app will be available at [http://localhost:3000](http://localhost:3000).

### Mobile Application (React Native / Expo)

To start the mobile application development server:
```bash
npm run mobile
```
This will open the Expo Dev Tools. You can run the app on:
-   **iOS Simulator**: Press `i`
-   **Android Emulator**: Press `a`
-   **Physical Device**: Scan the QR code using the Expo Go app.

### Shared Package

The `@travyl/shared` package contains shared types, logic, and configurations. It is automatically linked during the installation process.

## Environment Variables

Copy the example environment files (if provided) and fill in the required values:

-   `apps/web/.env.local`
-   `apps/mobile/.env`

Example variables needed:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Other Tools

### Presentation Generation
To regenerate the PowerPoint walkthroughs:
```bash
python3 presentation.py
python3 presentation2.py
python3 presentation_homepage.py
```

## Building for Production

### Web
```bash
cd apps/web
npm run build
```

### Mobile
For mobile builds, refer to the [EAS Documentation](https://docs.expo.dev/build/introduction/).
