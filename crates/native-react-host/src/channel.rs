use std::{collections::HashMap, sync::{mpsc, Arc, Mutex, OnceLock}, task::Waker};

pub enum HostMsg { Timer(u32), Invoke(u32, bool, String), Emit(String, String) }

#[derive(Clone)]
pub struct Emitter { tx: mpsc::Sender<HostMsg>, pub(crate) waker: Arc<Mutex<Option<Waker>>> }
impl Emitter {
    pub(crate) fn send(&self, m: HostMsg) {
        let _ = self.tx.send(m);
        if let Some(w) = self.waker.lock().unwrap().as_ref() { w.wake_by_ref(); }
    }
    /// Callable from any thread.
    pub fn emit(&self, event: &str, payload: serde_json::Value) { self.send(HostMsg::Emit(event.to_string(), payload.to_string())); }
}

/// Global emitter for Android lifecycle events
static GLOBAL_EMITTER: OnceLock<Emitter> = OnceLock::new();

pub fn set_global_emitter(emitter: Emitter) {
    let _ = GLOBAL_EMITTER.set(emitter);
}

pub fn get_global_emitter() -> Option<Emitter> {
    GLOBAL_EMITTER.get().cloned()
}

type Handler = Arc<dyn Fn(serde_json::Value, &Emitter) -> Result<serde_json::Value, String> + Send + Sync>;
#[derive(Clone, Default)]
pub struct Commands(Arc<Mutex<HashMap<String, Handler>>>);
impl Commands {
    pub fn new() -> Self { Self::default() }
    pub fn register<F>(&self, name: &str, f: F) where F: Fn(serde_json::Value, &Emitter) -> Result<serde_json::Value, String> + Send + Sync + 'static {
        self.0.lock().unwrap().insert(name.to_string(), Arc::new(f));
    }
    pub(crate) fn call(&self, name: &str, args: serde_json::Value, em: &Emitter) -> Result<serde_json::Value, String> {
        let h = self.0.lock().unwrap().get(name).cloned().ok_or_else(|| format!("unknown command: {name}"))?;
        h(args, em)
    }
}

pub fn channel() -> (Emitter, mpsc::Receiver<HostMsg>) {
    let (tx, rx) = mpsc::channel();
    (Emitter { tx, waker: Arc::new(Mutex::new(None)) }, rx)
}