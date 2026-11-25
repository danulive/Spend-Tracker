# SpendTracker

Mobile-first, OLED dark-mode personal finance PWA for daily savings proof, timestamped expense tracking, and private per-account Google Drive backup (`appDataFolder`).

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and set your Google Cloud Web OAuth Client ID:
   ```bash
   VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   ```
3. Start the local dev server:
   ```bash
   npm run dev
   ```

## Deploying to Vercel

1. Import this repository into Vercel.
2. Confirm build settings:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Open **Project Settings -> Environment Variables** and add `VITE_GOOGLE_CLIENT_ID` with your Google Cloud OAuth 2.0 Web Client ID.
4. Deploy. `vercel.json` handles SPA `/index.html` fallback routing and `max-age=0, must-revalidate` headers for `sw.js`, `registerSW.js`, and `manifest.webmanifest`.

## Post-Deploy Google Cloud Console Setup

1. Open [Google Cloud Console -> APIs & Services -> Credentials](https://console.cloud.google.com/apis/credentials) and select your OAuth 2.0 Web Client ID.
2. Under **Authorized JavaScript origins**, add your live Vercel domain (e.g. `https://your-app.vercel.app`) as well as `http://localhost:5173` for local development.
3. Ensure the **Google Drive API** is enabled in your Google Cloud project (`drive.appdata` scope).
4. Under **OAuth consent screen**, publish the app to **Production** so any Gmail user can sign in cleanly without test-user allowlist errors.

## Installing as a PWA

- **Android (Chrome):** Open the deployed URL, open Chrome's menu (`⋮`), and tap **Install app** (or **Add to Home screen**).
- **iOS (Safari):** Open the deployed URL in Safari, tap the **Share** icon, and choose **Add to Home Screen**.
- **Desktop (Chrome / Edge):** Click the install icon in the right side of the address bar or open browser menu -> **Install SpendTracker**.
