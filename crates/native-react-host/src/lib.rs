mod app;
mod channel;
mod dom;
mod engine;

pub use app::{run, Config};
pub use channel::{Commands, Emitter, get_global_emitter as get_emitter};
#[cfg(target_os = "android")]
pub use blitz_shell::set_android_app;