use native_react_host::{run, Commands, Config, get_emitter};
use std::time::Duration;

pub fn start() {
    let bundle = include_str!("../dist/bundle.js").to_string();
    let css = include_str!("../dist/bundle.css").to_string();
    let cfg = Config::from_json(serde_json::from_str(include_str!("../dist/app.json")).ok().as_ref());
    let commands = Commands::new();
    commands.register("greet", |args, _| {
        let name = args.get("name").and_then(|v| v.as_str()).unwrap_or("world");
        Ok(serde_json::json!(format!("Hello, {name}, from Rust!")))
    });
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
    use std::panic;

    native_react_host::set_android_app(app.clone());

    panic::set_hook(Box::new(|info| {
        let msg = format!("Panic: {}", info);
        log::error!("{}", msg);
    }));

    android_logger::init_once(
        android_logger::Config::default().with_max_level(log::LevelFilter::Debug)
    );

    let resumed = AtomicBool::new(false);

    let result = panic::catch_unwind(|| {
        start();
    });

    if let Err(e) = result {
        log::error!("start() panicked: {:?}", e);
        return;
    }

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
}