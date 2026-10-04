use anyrender_vello::VelloWindowRenderer;
use blitz_dom::DocumentConfig;
use blitz_html::HtmlDocument;
use blitz_shell::{create_default_event_loop, BlitzApplication, BlitzShellProxy, WindowConfig};
use winit::{dpi::LogicalSize, window::WindowAttributes};

use crate::{channel::{channel, Commands, Emitter, set_global_emitter}, dom::NativeDoc, engine::Js};

pub struct Config { pub title: String, pub width: f64, pub height: f64 }
impl Config {
    pub fn from_json(v: Option<&serde_json::Value>) -> Config {
        let g = |k: &str| v.and_then(|v| v.get(k));
        Config {
            title: g("title").and_then(|x| x.as_str()).unwrap_or("native-react").to_string(),
            width: g("width").and_then(|x| x.as_f64()).unwrap_or(900.0),
            height: g("height").and_then(|x| x.as_f64()).unwrap_or(700.0),
        }
    }
}

/// Runs the app. `setup` receives an Emitter usable from any thread (e.g. to start background producers).
pub fn run(bundle: String, css: String, cfg: Config, commands: Commands, setup: impl FnOnce(Emitter)) {
    let html = format!(
        "<!DOCTYPE html><html><head><style>*{{box-sizing:border-box}}html,body{{margin:0;padding:0;width:100%;height:100%;overflow:hidden}}button:focus,input:focus,[tabindex]:focus{{outline:2px solid #6c8cff;outline-offset:2px}}{css}</style></head><body></body></html>"
    );
    let base = HtmlDocument::from_html(&html, DocumentConfig { ua_stylesheets: Some(vec![]), ..Default::default() }).into_inner();
    let (emitter, rx) = channel();
    set_global_emitter(emitter.clone());
    let js = Js::new(&bundle, commands, emitter.clone()).unwrap_or_else(|e| { eprintln!("[host] bundle failed: {e}"); std::process::exit(1) });
    setup(emitter.clone());
    let doc = NativeDoc::new(base, js, rx, emitter);

    let event_loop = create_default_event_loop();
    let (proxy, receiver) = BlitzShellProxy::new(event_loop.create_proxy());
    let mut app = BlitzApplication::new(proxy, receiver);
    let attrs = WindowAttributes::default().with_title(cfg.title).with_surface_size(LogicalSize::new(cfg.width, cfg.height));
    app.add_window(WindowConfig::with_attributes(Box::new(doc) as _, VelloWindowRenderer::new(), attrs));
    event_loop.run_app(app).unwrap();
}