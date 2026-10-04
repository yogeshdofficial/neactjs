#!/usr/bin/env node
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync, watch, cpSync, rmSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const cmd = process.argv[2] || 'build';
const cwd = process.cwd();
const cfg = existsSync(resolve(cwd, 'native.config.json')) ? JSON.parse(readFileSync(resolve(cwd, 'native.config.json'), 'utf8')) : {};
const entry = resolve(cwd, cfg.entry || 'src/main.tsx');
const out = resolve(cwd, 'dist');

async function bundle(minify = false) {
  mkdirSync(out, { recursive: true });
  const scriptPath = decodeURIComponent(new URL(import.meta.url).pathname.replace(/^\//, ''));
  const polyfill = resolve(dirname(scriptPath), '../src/runtime/polyfills.js');
  const projectPolyfill = resolve(cwd, 'node_modules/.native-react-polyfill.js');
  cpSync(polyfill, projectPolyfill);
  await build({
    entryPoints: [entry], outfile: resolve(out, 'bundle.js'), bundle: true, format: 'iife', target: 'es2020', platform: 'browser',
    jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, minify, logLevel: 'info',
    loader: { '.module.css': 'local-css' }, conditions: ['browser', 'import'],
    inject: [projectPolyfill],
    external: [],
  });
  const css = resolve(out, 'bundle.css');
  if (!existsSync(css)) writeFileSync(css, '');
  const cfgOut = { title: cfg.title || 'native-react', width: cfg.width || 900, height: cfg.height || 700 };
  writeFileSync(resolve(out, 'app.json'), JSON.stringify(cfgOut));
  if (existsSync(resolve(cwd, 'src-native'))) cpSync(out, resolve(cwd, 'src-native/dist'), { recursive: true });
}

const hostBin = () => process.env.NATIVE_REACT_HOST || 'native-react-host';

async function createProject(name, targetDir) {
  const projectPath = resolve(targetDir, name);
  if (existsSync(projectPath)) {
    console.error(`Directory ${projectPath} already exists`);
    process.exit(1);
  }

  const template = {
    'package.json': JSON.stringify({
      name,
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: {
        typecheck: 'tsc --noEmit -p tsconfig.json',
        build: 'native-react build',
        dev: 'native-react dev',
        'package:android': 'native-react package --android',
        'package:desktop': 'native-react package',
      },
      dependencies: {
        'native-react': 'workspace:*',
        react: '18.3.1',
      },
      devDependencies: {
        '@types/react': '^18.3.0',
        typescript: '^5.6.0',
      },
    }, null, 2),
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        lib: ['ES2020'],
        types: [],
      },
      include: ['src'],
    }, null, 2),
    'native.config.json': JSON.stringify({
      entry: 'src/main.tsx',
      title: name,
      width: 520,
      height: 760,
    }, null, 2),
    'src/main.tsx': `import { useState } from 'react';
import { render, Root, Card, Stack, Heading, Text, Button } from 'native-react';

function App() {
  const [count, setCount] = useState(0);
  return (
    <Root>
      <Stack gap={16}>
        <Card>
          <Stack gap={10}>
            <Heading>Welcome to {count === 0 ? name : 'native-react'}!</Heading>
            <Text>Press the button to increment the counter.</Text>
            <Button onClick={() => setCount(count + 1)}>Count: {count}</Button>
          </Stack>
        </Card>
      </Stack>
    </Root>
  );
}

render(<App />);`,
    'src/theme.css': `:root {
  --bg: #0f1115;
  --fg: #e8eaf0;
  --card: #181b22;
  --border: #2a2f3a;
  --accent: #6c8cff;
  --muted: #8a91a3;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
button:focus, input:focus, [tabindex]:focus { outline: 2px solid #6c8cff; outline-offset: 2px; }`,
    'src/App.module.css': '',
    'src/globals.d.ts': `/// <reference types="native-react" />`,
    'src-native/Cargo.toml': `[package]
name = "${name.replace(/-/g, '_')}"
version = "0.1.0"
edition.workspace = true
rust-version.workspace = true

[lib]
name = "${name.replace(/-/g, '_')}"
crate-type = ["cdylib"]

[dependencies]
native-react-host = { path = "../../../crates/native-react-host" }
serde_json.workspace = true

[target.'cfg(target_os = "android")'.dependencies]
android-activity = { version = "0.6.0", features = ["native-activity"] }

[package.metadata.android]
package = "dev.nativereact.${name}"
build_targets = ["aarch64-linux-android"]
[package.metadata.android.sdk]
min_sdk_version = 26
target_sdk_version = 37
[[package.metadata.android.uses_permission]]
name = "android.permission.INTERNET"`,
    'src-native/src/lib.rs': `use native_react_host::{run, Commands, Config, get_emitter};
use std::time::Duration;

pub fn start() {
    let bundle = include_str!("../dist/bundle.js").to_string();
    let css = include_str!("../dist/bundle.css").to_string();
    let cfg = Config::from_json(serde_json::from_str(include_str!("../dist/app.json")).ok().as_ref());
    let commands = Commands::new();
    run(bundle, css, cfg, commands, |em| {
        std::thread::spawn(move || {
            let mut n = 0u32;
            loop { std::thread::sleep(Duration::from_secs(1)); n += 1; em.emit("tick", serde_json::json!(n)); }
        });
    });
}

#[cfg(target_os = "android")]
#[unsafe(no_mangle)]
fn android_main(app: android_activity::AndroidApp) {
    use android_activity::{input::{InputEvent, Axis, KeyAction}, InputStatus, MainEvent, PollEvent};
    use std::sync::atomic::{AtomicBool, Ordering};

    native_react_host::set_android_app(app.clone());

    let resumed = AtomicBool::new(false);
    start();

    loop {
        app.poll_events(None, |event| {
            match event {
                PollEvent::Main(main_event) => {
                    match main_event {
                        MainEvent::Resume { .. } => {
                            resumed.store(true, Ordering::SeqCst);
                            if let Some(em) = get_emitter() { em.emit("app:resume", serde_json::json!({})); }
                        }
                        MainEvent::Pause => {
                            resumed.store(false, Ordering::SeqCst);
                            if let Some(em) = get_emitter() { em.emit("app:pause", serde_json::json!({})); }
                        }
                        MainEvent::GainedFocus => {
                            if let Some(em) = get_emitter() { em.emit("app:focus", serde_json::json!({ "focused": true })); }
                        }
                        MainEvent::LostFocus => {
                            if let Some(em) = get_emitter() { em.emit("app:focus", serde_json::json!({ "focused": false })); }
                        }
                        MainEvent::ConfigChanged { .. } => {
                            if let Some(em) = get_emitter() { em.emit("app:configChanged", serde_json::json!({})); }
                        }
                        MainEvent::LowMemory => {
                            if let Some(em) = get_emitter() { em.emit("app:lowMemory", serde_json::json!({})); }
                        }
                        MainEvent::Start => {
                            if let Some(em) = get_emitter() { em.emit("app:start", serde_json::json!({})); }
                        }
                        MainEvent::Stop => {
                            if let Some(em) = get_emitter() { em.emit("app:stop", serde_json::json!({})); }
                        }
                        MainEvent::Destroy => {
                            if let Some(em) = get_emitter() { em.emit("app:destroy", serde_json::json!({})); }
                            return;
                        }
                        MainEvent::SaveState { .. } => {
                            if let Some(em) = get_emitter() { em.emit("app:saveState", serde_json::json!({})); }
                        }
                        MainEvent::InputAvailable => {
                            if let Ok(mut iter) = app.input_events_iter() {
                                loop {
                                    let has_more = iter.next(|event| {
                                        if let Some(em) = get_emitter() {
                                            match event {
                                                InputEvent::MotionEvent(motion) => {
                                                    let action = match motion.action() {
                                                        android_activity::input::MotionAction::Down => "down",
                                                        android_activity::input::MotionAction::Up => "up",
                                                        android_activity::input::MotionAction::Move => "move",
                                                        android_activity::input::MotionAction::Cancel => "cancel",
                                                        _ => "unknown",
                                                    };
                                                    let pointer = motion.pointer_at_index(0);
                                                    em.emit("input:touch", serde_json::json!({
                                                        "action": action,
                                                        "x": pointer.axis_value(Axis::X),
                                                        "y": pointer.axis_value(Axis::Y),
                                                        "pointerId": pointer.pointer_id(),
                                                    }));
                                                }
                                                InputEvent::KeyEvent(key) => {
                                                    let action = if key.action() == KeyAction::Down { "down" } else { "up" };
                                                    em.emit("input:key", serde_json::json!({
                                                        "action": action,
                                                        "keyCode": u32::from(key.key_code()),
                                                    }));
                                                }
                                                _ => {}
                                            }
                                        }
                                        InputStatus::Unhandled
                                    });
                                    if !has_more { break; }
                                }
                            }
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        });
    }
}`,
  };

  function writeTemplate(obj, basePath = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = resolve(projectPath, basePath, key);
      if (typeof value === 'object' && value !== null) {
        mkdirSync(fullPath, { recursive: true });
        writeTemplate(value, fullPath);
      } else {
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, value);
      }
    }
  }

  writeTemplate(template);
  console.log(`Created project ${name} at ${projectPath}`);
  console.log('Run `cd ${name} && pnpm install` to install dependencies');
}

if (cmd === 'build') await bundle();
else if (cmd === 'dev') {
  await bundle();
  let child, restarting = false;
  const start = () => {
    child = spawn(hostBin(), [resolve(out, 'bundle.js')], { stdio: 'inherit' });
    child.on('exit', code => { if (!restarting) process.exit(code ?? 0); });
  };
  start();
  let t;
  watch(resolve(cwd, 'src'), { recursive: true }, () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      try { await bundle(); } catch { return; }
      restarting = true; child.kill(); await new Promise(r => setTimeout(r, 150)); restarting = false; start();
    }, 150);
  });
} else if (cmd === 'package') {
  await bundle(true);
  const android = process.argv.includes('--android');
  if (!existsSync(resolve(cwd, 'src-native/Cargo.toml'))) { console.error('src-native/Cargo.toml missing'); process.exit(1); }
  const args = android ? ['apk', 'build', '--release'] : ['build', '--release'];
  const r = spawnSync('cargo', [...args, '--manifest-path', resolve(cwd, 'src-native/Cargo.toml')], { stdio: 'inherit', shell: process.platform === 'win32' });
  process.exit(r.status ?? 1);
} else if (cmd === 'create') {
  const name = process.argv[3];
  const targetDir = process.argv[4] || '.';
  if (!name) { console.error('Usage: native-react create <project-name> [target-dir]'); process.exit(1); }
  await createProject(name, targetDir);
} else { console.error('usage: native-react build | dev | package [--android] | create <name> [dir]'); process.exit(1); }