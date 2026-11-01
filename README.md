# GK PDF Reader

A bare React Native 0.81 app for reading PDFs, marking them up, and sharing a flattened copy. It does not use Expo.

The Android package id is `com.pdfreader`. The home-screen name is PDF Reader. The icon is a red square with white GK letters.

## Install the APK

The release APK checked into this repo is built for 64-bit ARM phones. It will not install on an x86 emulator.

[PDF-Reader.apk](artifacts/mobile/PDF-Reader.apk)

Open that file on the phone. Android may ask you to allow installs from the browser or the Files app. The JavaScript bundle, the GK icon, and the sample handbook are inside the APK, so the app runs without a computer.

The APK is signed with the debug keystore in `artifacts/mobile/android/app/debug.keystore` (password `android`, alias `androiddebugkey`). That signature is fine for sideloading. A Play Store build needs its own release key.

## What you need for development

- Node 20 or newer
- pnpm 10. The repo rejects npm and yarn on install.
- JDK 17 or 21
- Android SDK: platform 36, build-tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1
- For iOS: a Mac with Xcode, then `pod install` inside `artifacts/mobile/ios`

Set `ANDROID_HOME` to the SDK root before any Gradle command.

Install dependencies from the repo root:

```bash
pnpm install
```

pnpm will refuse a package version that was published less than one day ago. That check lives in `pnpm-workspace.yaml` and should stay on.

## Run the app

From `artifacts/mobile`:

```bash
pnpm start
```

In another terminal:

```bash
pnpm android
```

On a Mac:

```bash
cd ios && pod install && cd ..
pnpm ios
```

`pnpm android` and `pnpm ios` build a debug app that loads JavaScript from Metro. The phone and the computer have to be on a network where the device can reach port 8081.

## Build a release APK

From `artifacts/mobile/android`, with `ANDROID_HOME` set:

```bash
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. Copy it over `artifacts/mobile/PDF-Reader.apk` when you want the file in git to match the build.

`arm64-v8a` matches current phones. Drop that flag to build the ABIs listed in `android/gradle.properties`.

Release builds bundle the JavaScript into the APK. Debug builds do not, so a debug APK is not a standalone install.

## Tests and typecheck

From the repo root:

```bash
pnpm --filter @workspace/mobile test
pnpm --filter @workspace/mobile typecheck
```

The tests cover:

- Library saves. A page-turn update cannot erase markup that was just written.
- Phrase search. A match is the phrase, not every word on the page.
- Flattened export. Typed text, a highlight, a stroke, and a sticky note are burned into the PDF.
- Reading. The same PDF.js build the viewer uses opens the sample handbook (207 pages) and reads the first page.

## How the app is put together

```
artifacts/mobile
  index.js                 App entry. Registers the PDFReader component.
  App.tsx                  Providers and the navigation container.
  app/(tabs)/index.tsx     Library. Import, recents, sample PDF.
  app/(tabs)/favorites.tsx Favorites.
  app/(tabs)/settings.tsx  Theme, clear library.
  app/viewer/[id].tsx      Reader screen.
  navigation/              Bottom tabs and the native stack.
  components/PDFViewer.tsx WebView that hosts the viewer page.
  constants/pdfHtml.ts     Viewer page: virtualized pages, ink, search, forms.
  vendor/pdfjsSources.ts   PDF.js 3.11.174, stored in the app. No network fetch.
  state/libraryReducer.ts  Library updates, applied one at a time.
  context/LibraryContext.tsx  Persists the library in AsyncStorage.
  utils/files.ts           Documents-folder reads and deletes.
  utils/importPdf.ts       System document picker, then a private copy.
  utils/shareUtils.ts      Share the original, a flattened copy, or a notes PDF.
  utils/flattenPdf.ts      Burns marks into a PDF with pdf-lib.
  assets/images/icon.png   GK logo, also the launcher artwork.
  assets/sample/           HemeOnc handbook, seeded on a new install.
  android/  ios/           Native projects.
```

Imports that start with `@/` are resolved by `babel-plugin-module-resolver` in `babel.config.js`. TypeScript uses the same alias in `tsconfig.json`. Metro watches the repo root so pnpm packages outside `artifacts/mobile/node_modules` still resolve. That config is `metro.config.js`.

`@react-native/codegen` is a direct dependency. The Android new-architecture build looks for it in this package's `node_modules`, and pnpm does not hoist it there otherwise.

## Reader behavior

The viewer is a WebView. `PDFViewer` reads the file as base64 and posts it into the page from `pdfHtml.ts`. PDF.js runs on the main thread with the vendored worker, so the app does not download a script at open time.

Only pages near the viewport are rendered. Pinch zoom previews with a CSS scale and re-renders once the gesture ends. Thumbnails are built when the strip is opened.

Ink, highlights, shapes, stamps, and typed text are stored as vectors in PDF coordinates on the library record. They survive reload, undo, and zoom. Older full-page PNG snapshots still draw underneath. Sticky notes and AcroForm values are saved with the file.

Library writes go through one queue. A progress update cannot overwrite a markup save that was queued first. The storage key is `@pdf_library_v1`.

Clearing the library deletes imported copies and stays empty. The sample handbook is added only on a first install, and can be added again from the empty library with "Try Sample PDF".

Deleting a file removes the library entry and the copy under the app documents folder when that copy belongs to the app.

Share can send the original PDF, a copy with marks burned in, a text summary on the clipboard, or a short notes PDF. pdf-lib 1.17.1 cannot decrypt a password-protected file, so an encrypted PDF has to be shared as the original or unlocked in another app first.

## Native modules

| Job | Package |
| --- | --- |
| Navigation | React Navigation native stack and bottom tabs |
| File storage | `react-native-blob-util` |
| Import | `@react-native-documents/picker` |
| Share | `react-native-share` |
| Clipboard | `@react-native-clipboard/clipboard` |
| Icons | `react-native-vector-icons` Feather. The font is `ios/PDFReader/Fonts/Feather.ttf` and is copied on Android by `fonts.gradle`. |
| Viewer | `react-native-webview` |
| Library storage | `@react-native-async-storage/async-storage` |

Haptics use the platform vibration API. There is no separate haptics native module.

## Theme and logo

Light, dark, and system theme are stored under `@theme_preference`. The GK mark is red and white. The rest of the UI still uses the violet primary (`#7C3AED` / `#8B5CF6`).

Launcher icons are the mipmap files under `android/app/src/main/res`. iOS icons are in `ios/PDFReader/Images.xcassets/AppIcon.appiconset`. The source image is `assets/images/icon.png`. The iOS launch screen title is GK.
