# Mobile Client

Haru Study is an Android React Native / Expo application for manually created study material.

## What is included

- Register, verify email, password login, Google login, forgot/reset password, profile, rotating session refresh, and logout.
- Admin account lookup and deletion for accounts with the ADMIN role.
- Create, edit, delete, and search decks; create, edit, and delete flashcards and four-choice questions manually.
- Study one deck or every deck: flip flashcards, reverse front/back, shuffle, mark remembered/missed, see a round summary, and retry missed items.
- Practice one deck's questions or every question: choose an answer, see feedback and the correct answer, see results, and retry missed items.
- Android back navigation, secure native token storage, loading/error/empty states.

The app calls only User and Content APIs through the gateway. It has no AI, chatbot, AI generation, CSV import, SRS, or Analytics integration. Round results live in memory and reset when practice ends. Your decks/cards/questions are saved on the server. An internet or local backend connection is required.

## 1. Install the Windows prerequisites once

1. Install **Node.js 22 LTS** and ensure `node --version` works in a new PowerShell window. The repo uses pnpm through Corepack. If Corepack is missing, install it with `npm install --global corepack`.
2. Install **Docker Desktop**, enable its WSL 2 backend / Linux containers, and start it. `docker info` must work.
3. Install **JDK 17**. Set `JAVA_HOME` to that JDK directory and add `%JAVA_HOME%\bin` to your user PATH. Confirm with `java -version`.
4. Install **Android Studio**. Finish its setup wizard. In **SDK Manager**, install Android SDK Platform 35, Android SDK Build-Tools 35, Android SDK Platform-Tools, Android Emulator, and Android SDK Command-line Tools. Accept Android SDK licenses if prompted.
5. Set the user environment variable `ANDROID_HOME` to your SDK path, normally `C:\Users\YOUR_NAME\AppData\Local\Android\Sdk`. Add `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator` to your user PATH. Reopen PowerShell after changing environment variables.
6. In Android Studio, open **More Actions → Virtual Device Manager** (or **Tools → Device Manager**). Create a Pixel virtual device with an **API 35 Google Play** system image. Choose the architecture recommended for your laptop. Click its Play button and wait until the Android home screen appears. Google sign-in needs a Google Play image.

If the emulator reports missing hardware acceleration, enable virtualization in BIOS/UEFI and Windows Hypervisor Platform, following the Android Studio instructions. The emulator runs a real virtual Android device on your laptop; a browser preview is a separate option below.

Official references: [Expo Android emulator setup](https://docs.expo.dev/workflow/android-studio-emulator/), [Android hardware acceleration](https://developer.android.com/studio/run/emulator-acceleration).

## 2. Install project dependencies

Run every command below from the repository root:

```powershell
cd C:\Vy\KITSproject-Study_tool
corepack pnpm install
corepack pnpm mobile:check
```

The check reports missing commands. It can discover the default Android SDK directory automatically for the current process; it does not modify your Windows environment settings.

The Android emulator uses `http://10.0.2.2:3000` by default. No `.env` file is needed for ordinary local testing. To customize it:

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

Edit that file, then restart Metro after changing a value. `EXPO_PUBLIC_*` values are bundled into the app; keep API secrets out of them.

## 3. Start the mobile backend

In PowerShell terminal 1:

```powershell
corepack pnpm mobile:backend
```

This uses **docker-compose.mobile.yml**, not the full project's compose file. It starts the gateway, User service, Content service, two dedicated Postgres databases, and Mailpit. AI, Analytics, RabbitMQ, and the existing web app are not started. The mobile stack has its own database volumes, so the first library is empty. If another stack already occupies port 3000 or 8025, stop that stack first.

Check `http://localhost:3000/health` in your laptop browser. To inspect startup problems:

```powershell
docker compose -f docker-compose.mobile.yml ps
docker compose -f docker-compose.mobile.yml logs --tail 80 user-service content-service api-gateway
```

A local account is seeded automatically: **test / test1234**. It is a regular user. Its password and sessions are reset when the User service container starts; use a newly registered account for persistent personal testing.

## 4. Build and run on the laptop's Android emulator

Keep the emulator running. In PowerShell terminal 2:

```powershell
corepack pnpm mobile:android
```

The first run generates the native Android project, downloads Gradle/Android dependencies, builds a debug development app, installs it on the emulator, and starts Metro. Keep that terminal open. Once installed, JavaScript edits reload without rebuilding the native app.

For later sessions, open the emulator and run:

```powershell
corepack pnpm mobile:start
```

Press **a** in the Metro terminal to open the installed Android app. Re-run `mobile:android` after adding or changing native dependencies or Expo plugins. The generated `apps/mobile/android` directory is ignored by Git; `app.config.ts` is the configuration source.

This repository keeps Expo SDK 53 and pins its compatible React / React Native versions. Use this development build as the normal path. The latest Expo Go may not support SDK 53, and Google native login is not available in Expo Go.

Android's emulator reaches the laptop through **10.0.2.2**, whereas `localhost` inside Android refers to the emulator itself. [Android networking reference](https://developer.android.com/studio/run/emulator-networking-address).

## 5. Walk through the app

1. Sign in with `test / test1234`.
2. Tap **Create a deck**, enter a title, and save. Open the deck in the library.
3. Tap **Add a flashcard**. Enter `안녕하세요` on the front, `Hello` on the back, and save. Add another card to test a multi-item session.
4. Choose **Questions → Add a question**. Enter a prompt, all four choices, and select the correct choice. Save. Questions can exist without flashcards.
5. Tap **Study these flashcards**. Choose shuffle/reverse if wanted; start, reveal each answer, and choose Got it or Review again. At the end, retry missed items.
6. Tap **Practice these questions**. Choose an answer, check it, and continue to results. Test a wrong answer and retry it.
7. Create a second deck. In the **Practice** tab, use **Study all flashcards** and **Practice all questions** to include both decks.
8. Test editing/deleting cards, questions, and decks. Permanent deletes ask for confirmation.
9. Open **Account**, refresh your profile/session, and sign out. Close and reopen the Android app while signed in to test secure session restoration.

To test registration, verification, or password reset, use an address such as `learner@example.com`. All local outgoing mail is captured in **http://localhost:8025** on your laptop. Open the message, copy its six-digit code, and type it into the emulator. Real email delivery is not required in this mobile stack.

To test admin tools, register and verify an email listed in `USER_ADMIN_EMAILS` in the root `.env` (default: `admin@example.com`). The role is assigned at account creation. Sign in, open Account, and look up another test account by numeric ID. The server rejects admin requests from regular users. Deleting an account removes its login; Content service data is not automatically purged across services.

## Optional: browser preview on the laptop

With the backend running, use another terminal:

```powershell
corepack pnpm mobile:web
```

Open **http://localhost:8081**. This renders the mobile React Native UI in your browser; narrow the window or use browser device emulation to inspect the layout. It uses `localhost:3000` automatically. Password/account/content/study flows work here. Google login is Android-only. Browser preview tokens stay in memory, so reloading the page requires signing in again. Use the Android emulator to test native storage, Google login, hardware Back, and the Android keyboard.

## Optional: Google sign-in setup

Username/password login needs no Google configuration. Google login is implemented, but your project's OAuth credentials must be configured:

1. In Google Cloud Console, configure the consent screen and create a **Web application** OAuth client. Put that client ID in root `.env` as `GOOGLE_CLIENT_ID` and in `apps/mobile/.env` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Both must match. Configure consent-screen test users if the project is in testing mode.
2. After the first native build, get your debug signing SHA-1:

   ```powershell
   cd apps/mobile/android
   .\gradlew.bat signingReport
   cd ../../..
   ```

3. In the same Google Cloud project, create an **Android** OAuth client for package **com.kits.harustudy** using that SHA-1. The Android client identifies the installed app; the Web client ID is the token audience used by the backend.
4. Restart the backend with `corepack pnpm mobile:backend`, restart Metro after `.env` changes, and tap **Continue with Google** in the Android development build. Use a Google Play emulator with working Play Services.

The app sends the signed Google ID token to User service, which verifies it. Credentials and the consent-screen setup cannot be generated by the repository. See [React Native Google Sign-In Expo setup](https://react-native-google-signin.github.io/docs/setting-up/expo) and [Android setup](https://react-native-google-signin.github.io/docs/setting-up/android).

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `docker` missing / daemon unavailable | Install/start Docker Desktop, use Linux containers, reopen PowerShell. |
| `adb` or SDK not found | Set ANDROID_HOME and PATH; run `corepack pnpm mobile:check`. |
| Java or Gradle build failure | Confirm JDK 17 and Android SDK 35; accept SDK licenses; inspect the first build error. |
| No Android device | Start the AVD in Device Manager; `adb devices` should list an emulator. |
| Cannot reach server | Confirm the compose services are running and API URL is `http://10.0.2.2:3000` for the emulator. |
| Metro cannot connect | Keep Metro running; try `adb reverse tcp:8081 tcp:8081`, then reopen the development app. |
| Port 8081 occupied | Stop the browser preview before starting Android Metro, or stop the other Metro process. |
| New account cannot sign in | Verify its email using the code in the local Mailpit inbox. |
| Google `DEVELOPER_ERROR` / code 10 | Verify package name, signing SHA-1, matching Web client ID, and Google Play Services. |
| App cannot find a native module | Rebuild with `mobile:android`; Expo Go does not include Google Sign-In. |
| A code change does not show | Restart Metro with `corepack pnpm --filter @korean-learning/mobile start --dev-client --clear`. |

## Checks and stopping

```powershell
corepack pnpm --filter @korean-learning/mobile typecheck
corepack pnpm --filter @korean-learning/mobile test
corepack pnpm --filter @korean-learning/mobile export:android
corepack pnpm --filter @korean-learning/mobile export:web
corepack pnpm --filter @korean-learning/content-service test

# User HTTP contract tests (isolated DB doubles; no Postgres needed):
cd apps/user-service
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
cd ../..

# Stop Metro with Ctrl+C; stop backend while preserving database volumes:
corepack pnpm mobile:stop
```

Android export verifies the JavaScript bundle; it does not create an APK. Once the emulator build works, a local debug APK is at `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`. It uses Metro. To create a standalone installable APK, use the `preview` profile in `eas.json` with EAS Build (`eas build --platform android --profile preview`) after configuring your Expo project and a reachable backend URL. For release, use HTTPS and turn off the local cleartext-traffic setting in `app.config.ts`. Backend services must enforce authenticated ownership (`CONTENT_REQUIRE_AUTH=true` in the mobile compose file).
