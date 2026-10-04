use rquickjs::{Context, Ctx, Function, Object, Runtime};
use std::{cell::RefCell, collections::HashMap, rc::Rc, sync::{atomic::{AtomicBool, Ordering}, Arc}, time::Duration};

use crate::channel::{Commands, Emitter, HostMsg};

pub struct Js {
    pub rt: Runtime,
    pub ctx: Context,
    pub pending_ops: Rc<RefCell<Vec<String>>>,
}

fn qerr(e: rquickjs::Error) -> String { format!("{e}") }

impl Js {
    pub fn new(bundle: &str, commands: Commands, emitter: Emitter) -> Result<Js, String> {
        let rt = Runtime::new().map_err(qerr)?;
        rt.set_max_stack_size(8 * 1024 * 1024);
        rt.set_memory_limit(1024 * 1024 * 1024);
        let ctx = Context::full(&rt).map_err(qerr)?;
        let pending_ops = Rc::new(RefCell::new(Vec::<String>::new()));
        let timers: Rc<RefCell<HashMap<u32, Arc<AtomicBool>>>> = Rc::new(RefCell::new(HashMap::new()));
        let ops = pending_ops.clone();
        ctx.with(|ctx| -> Result<(), rquickjs::Error> {
            let b = Object::new(ctx.clone())?;
            let ops2 = ops.clone();
            b.set("flushCommands", Function::new(ctx.clone(), move |s: String| { ops2.borrow_mut().push(s); })?)?;
            b.set("log", Function::new(ctx.clone(), |lvl: String, msg: String| { eprintln!("[js:{lvl}] {msg}"); })?)?;
            let em = emitter.clone();
            let t2 = timers.clone();
            b.set("setTimer", Function::new(ctx.clone(), move |id: u32, ms: f64, repeat: bool| {
                let flag = Arc::new(AtomicBool::new(false));
                t2.borrow_mut().insert(id, flag.clone());
                let em = em.clone();
                std::thread::spawn(move || loop {
                    std::thread::sleep(Duration::from_millis(ms.max(0.0) as u64));
                    if flag.load(Ordering::SeqCst) { break; }
                    em.send(HostMsg::Timer(id));
                    if !repeat { break; }
                });
            })?)?;
            let t3 = timers.clone();
            b.set("clearTimer", Function::new(ctx.clone(), move |id: u32| {
                if let Some(f) = t3.borrow_mut().remove(&id) { f.store(true, Ordering::SeqCst); }
            })?)?;
            let em = emitter.clone();
            let cmds = commands.clone();
            b.set("invoke", Function::new(ctx.clone(), move |id: u32, cmd: String, args: String| {
                let em = em.clone();
                let cmds = cmds.clone();
                std::thread::spawn(move || {
                    let args = serde_json::from_str(&args).unwrap_or(serde_json::Value::Null);
                    let (ok, out) = match cmds.call(&cmd, args, &em) {
                        Ok(v) => (true, v),
                        Err(e) => (false, serde_json::Value::String(e)),
                    };
                    em.send(HostMsg::Invoke(id, ok, out.to_string()));
                });
            })?)?;
            b.set("listenAdd", Function::new(ctx.clone(), |_ev: String| {})?)?;
            b.set("fsRead", Function::new(ctx.clone(), |p: String| -> String { std::fs::read_to_string(p).unwrap_or_default() })?)?;
            b.set("fsWrite", Function::new(ctx.clone(), |p: String, d: String| { let _ = std::fs::write(p, d); })?)?;
            b.set("fsExists", Function::new(ctx.clone(), |p: String| std::path::Path::new(&p).exists())?)?;
            b.set("fsList", Function::new(ctx.clone(), |p: String| -> String {
                let v: Vec<String> = std::fs::read_dir(p).map(|r| r.flatten().map(|e| e.file_name().to_string_lossy().into_owned()).collect()).unwrap_or_default();
                serde_json::to_string(&v).unwrap()
            })?)?;
            b.set("osInfo", Function::new(ctx.clone(), || -> String {
                serde_json::json!({
                    "platform": std::env::consts::OS,
                    "home": std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")).unwrap_or_default(),
                    "tmp": std::env::temp_dir().to_string_lossy(),
                }).to_string()
            })?)?;
            ctx.globals().set("RustBridge", b)?;
            Ok(())
        }).map_err(qerr)?;
        let js = Js { rt, ctx, pending_ops };
        js.ctx.with(|ctx| ctx.eval::<(), _>(bundle).map_err(|e| describe(&ctx, e)))?;
        js.run_jobs();
        Ok(js)
    }

    pub fn run_jobs(&self) { while self.rt.execute_pending_job().unwrap_or(false) {} }

    pub fn dispatch(&self, chain: Vec<u32>, ty: &str, payload: &str) -> bool {
        let r = self.ctx.with(|ctx| -> Result<bool, String> {
            let f: Function = ctx.globals().get("__dispatch").map_err(qerr)?;
            f.call((chain, ty.to_string(), payload.to_string())).map_err(|e| describe(&ctx, e))
        });
        self.run_jobs();
        r.unwrap_or_else(|e| { eprintln!("[host] dispatch error: {e}"); false })
    }

    pub fn call_global<A: for<'js> rquickjs::function::IntoArgs<'js>>(&self, name: &str, args: A) {
        let r = self.ctx.with(|ctx| -> Result<(), String> {
            let f: Function = ctx.globals().get(name).map_err(qerr)?;
            f.call::<_, ()>(args).map_err(|e| describe(&ctx, e))
        });
        if let Err(e) = r { eprintln!("[host] {name} error: {e}"); }
        self.run_jobs();
    }

    pub fn take_ops(&self) -> Vec<String> { std::mem::take(&mut *self.pending_ops.borrow_mut()) }
}

fn describe(ctx: &Ctx<'_>, e: rquickjs::Error) -> String {
    if let rquickjs::Error::Exception = e {
        let ex = ctx.catch();
        if let Some(o) = ex.as_object() {
            let stack: String = o.get("stack").unwrap_or_default();
            let msg: String = o.get("message").unwrap_or_default();
            return format!("{msg}\n{stack}");
        }
        return format!("{ex:?}");
    }
    format!("{e}")
}
