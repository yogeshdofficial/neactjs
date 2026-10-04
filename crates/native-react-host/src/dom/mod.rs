mod events;
mod exec;

use blitz_dom::{BaseDocument, DocGuard, DocGuardMut, Document, EventDriver};
use blitz_traits::events::UiEvent;
use std::{cell::RefCell, rc::Rc, sync::mpsc, task::Context};

use crate::{channel::{Emitter, HostMsg}, engine::Js};
use events::Bridge;
use exec::{apply, IdMap};

pub struct NativeDoc {
    base: BaseDocument,
    js: Rc<Js>,
    ids: Rc<RefCell<IdMap>>,
    rx: mpsc::Receiver<HostMsg>,
    emitter: Emitter,
}

impl NativeDoc {
    pub fn new(base: BaseDocument, js: Js, rx: mpsc::Receiver<HostMsg>, emitter: Emitter) -> Self {
        let mut d = NativeDoc { base, js: Rc::new(js), ids: Rc::new(RefCell::new(IdMap::default())), rx, emitter };
        // Initialize body element as ID 0
        if let Ok(Some(body)) = d.base.query_selector("body") {
            d.ids.borrow_mut().fwd.insert(0, body);
            d.ids.borrow_mut().rev.insert(body, 0);
        }
        d.flush_ops();
        d
    }
    fn flush_ops(&mut self) -> bool {
        let batches = self.js.take_ops();
        let any = !batches.is_empty();
        let mut ids = self.ids.borrow_mut();
        for b in batches { apply(&mut self.base, &mut ids, &b); }
        any
    }
}

impl Document for NativeDoc {
    fn inner(&self) -> DocGuard<'_> { DocGuard::Ref(&self.base) }
    fn inner_mut(&mut self) -> DocGuardMut<'_> { DocGuardMut::Ref(&mut self.base) }

    fn handle_ui_event(&mut self, event: UiEvent) {
        let handler = Bridge { js: self.js.clone(), ids: self.ids.clone() };
        
        // Catch panics from blitz-dom event handling to prevent app crash
        let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let mut driver = EventDriver::new(self, handler);
            driver.handle_ui_event(event);
        }));
    }

    fn poll(&mut self, cx: Option<Context<'_>>) -> bool {
        if let Some(cx) = cx { *self.emitter.waker.lock().unwrap() = Some(cx.waker().clone()); }
        let mut changed = false;
        while let Ok(m) = self.rx.try_recv() {
            match m {
                HostMsg::Timer(id) => self.js.call_global("__fireTimer", (id,)),
                HostMsg::Invoke(id, ok, json) => self.js.call_global("__resolveInvoke", (id, ok, json)),
                HostMsg::Emit(ev, json) => self.js.call_global("__emit", (ev, json)),
            }
            changed = true;
        }
        self.js.run_jobs();
        self.flush_ops() || changed
    }
}