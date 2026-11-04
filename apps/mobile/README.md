# Capacitor Android Client

`apps/mobile` is a thin Android shell around the production React/Vite UI in
`apps/web`. There is no duplicate mobile UI: every web build is copied into the
native project by Capacitor.

## Requirements

- Node.js 22 and Corepack
- JDK 21
- Android Studio with Android SDK 35, Platform Tools and an API 35 emulator
- `ANDROID_HOME` configured, or the SDK installed at the default Windows path
- Docker Desktop when using the full Compose backend

Check the machine:

```powershell
corepack pnpm install
corepack pnpm mobile:check
```

## Backend

The wrapped web app uses User, Content, AI and Analytics through the API
Gateway, so mobile development uses the full stack:

```powershell
corepack pnpm mobile:backend
```

The installable app calls `https://kitsproject-study-tool.onrender.com`.
Set `VITE_API_URL=http://10.0.2.2:3000` before syncing only when the emulator
should use a Gateway running on the host machine.

## Build and run

Start an API 35 emulator, then run:

```powershell
corepack pnpm mobile:android
```

This command builds `apps/web`, synchronizes Capacitor plugins/assets, and
installs the debug app. The generated APK is:

```text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

For a build without installing it:

```powershell
corepack pnpm mobile:sync
cd apps/mobile/android
.\gradlew.bat assembleDebug
```

The native Android project is committed. Do not run `cap add android` again.
Run `mobile:sync` after changing dependencies, native plugins, or before an APK
build.

## Live reload

Keep the local web/Gateway/services running:

```powershell
corepack pnpm run:all
corepack pnpm run:ai
```

Then, in another terminal:

```powershell
corepack pnpm mobile:dev
```

The development app loads Vite from `http://10.0.2.2:5173`. This URL is only
stored in the generated debug configuration; release builds use bundled files.

## Authentication

- Password, registration, OTP verification and password reset use the existing
  User Service endpoints.
- Android sends `X-Client-Platform: android`, receives a rotating refresh token,
  and stores the session with Android Keystore-backed secure storage.
- Google Sign-In is intentionally hidden in the Capacitor app for this
  milestone. It requires a native Google plugin, Android OAuth client and SHA-1
  configuration.

## Local HTTP and production

Debug builds allow cleartext traffic for emulator development. Release builds
must use an HTTPS `VITE_API_URL`; do not add cleartext permission to the main
Android manifest.

## Checks

```powershell
corepack pnpm --filter @korean-learning/mobile typecheck
corepack pnpm --filter @korean-learning/web typecheck
corepack pnpm --filter @korean-learning/web test
corepack pnpm --filter @korean-learning/api-gateway test
corepack pnpm mobile:sync
```

Stop the Compose backend:

```powershell
corepack pnpm mobile:stop
```
