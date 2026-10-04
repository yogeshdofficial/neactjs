use native_react_host::{run, Commands, Config};

fn main() {
    let path = std::env::args().nth(1).expect("usage: native-react-host <bundle.js>");
    let bundle = std::fs::read_to_string(&path).expect("cannot read bundle");
    let css = std::fs::read_to_string(std::path::Path::new(&path).with_file_name("bundle.css")).unwrap_or_default();
    let cfg = std::fs::read_to_string(std::path::Path::new(&path).with_file_name("app.json")).ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok());
    run(bundle, css, Config::from_json(cfg.as_ref()), Commands::new(), |_| {});
}
