# native-react

React + JSX + CSS → Native Apps (Windows, Linux, macOS, Android). No WebView.

## Quick Start

```bash
# 1. Install deps
pnpm install

# 2. Build example
cd examples/hello && pnpm run build

# 3. Run Desktop
# From workspace root:
cargo run -p native-react-host -- examples/hello/dist/bundle.js

# 4. Run Android
cd examples/hello/src-native
cargo apk build
adb install ../../../target/debug/apk/hello_native.apk
```

## Project Structure

```
native-react/
├── crates/native-react-host/    # Rust host (Blitz + QuickJS + Vello)
├── packages/native-react/       # React runtime, CLI, UI components
├── examples/
│   ├── hello/                   # Basic counter/todo app
│   │   ├── src/                 # React code
│   │   └── src-native/          # Rust Android entry
│   └── npm-showcase/            # zustand, date-fns, uuid demo
│       ├── src/
│       └── src-native/
├── Cargo.toml                   # Rust workspace
├── package.json                 # pnpm workspace
└── README.md
```

## Commands

| Task | Directory | Command |
|------|-----------|---------|
| Install deps | Root | `pnpm install` |
| Build JS (hello) | `examples/hello` | `pnpm run build` |
| Build JS (npm-showcase) | `examples/npm-showcase` | `pnpm run build` |
| Run Desktop (hello) | Root | `cargo run -p native-react-host -- examples/hello/dist/bundle.js` |
| Run Desktop (npm-showcase) | Root | `cargo run -p native-react-host -- examples/npm-showcase/dist/bundle.js` |
| Dev (hot reload) | `examples/hello` | `pnpm run dev` |
| Build Android APK (hello) | `examples/hello/src-native` | `cargo apk build` |
| Build Android APK (npm-showcase) | `examples/npm-showcase/src-native` | `cargo apk build` |
| Install APK | Anywhere | `adb install target/debug/apk/<name>.apk` |

## Android Prerequisites

- Android NDK r29+ installed
- `ANDROID_NDK_ROOT` env var set
- `cargo-apk` installed (`cargo install cargo-apk`)

## Troubleshooting

**"greet doesn't work"** → Rebuild: `cd examples/hello && pnpm run build`

**Android crashes** → Check logcat: `adb logcat | grep native-react`

**Desktop crashes** → Ensure bundle is rebuilt after changes