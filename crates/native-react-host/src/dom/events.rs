use blitz_dom::{DocGuardMut, Document, EventHandler, NodeId};
use blitz_traits::events::{BlitzPointerEvent, DomEvent, DomEventData, EventState};
use std::{cell::RefCell, rc::Rc};

use super::exec::{apply, IdMap};
use crate::engine::Js;

pub(super) struct Bridge { pub js: Rc<Js>, pub ids: Rc<RefCell<IdMap>> }

fn name_and_payload(d: &DomEventData) -> Option<(&'static str, serde_json::Value)> {
    use serde_json::json;
    let ptr = |e: &BlitzPointerEvent| json!({ "x": e.client_x(), "y": e.client_y() });
    Some(match d {
        DomEventData::Click(e) => ("click", ptr(e)),
        DomEventData::DoubleClick(e) => ("dblclick", ptr(e)),
        DomEventData::MouseDown(e) => ("mousedown", ptr(e)),
        DomEventData::MouseUp(e) => ("mouseup", ptr(e)),
        DomEventData::MouseEnter(e) => ("mouseenter", ptr(e)),
        DomEventData::MouseLeave(e) => ("mouseleave", ptr(e)),
        DomEventData::Input(e) => ("input", json!({ "value": e.value })),
        DomEventData::KeyDown(e) => ("keydown", json!({ "key": e.key.to_string(), "code": e.code.to_string() })),
        DomEventData::KeyUp(e) => ("keyup", json!({ "key": e.key.to_string(), "code": e.code.to_string() })),
        DomEventData::Focus(_) => ("focus", json!({})),
        DomEventData::Blur(_) => ("blur", json!({})),
        _ => return None,
    })
}

impl EventHandler for Bridge {
    fn handle_event(&mut self, chain: &[NodeId], event: &mut DomEvent, doc: &mut dyn Document, state: &mut EventState) {
        let Some((name, payload)) = name_and_payload(&event.data) else { return };
        
        // Filter chain to only include nodes that exist in our IdMap
        let chain_ids: Vec<u32> = { 
            let ids = self.ids.borrow(); 
            chain.iter()
                .filter_map(|n| ids.rev.get(n).copied())
                .collect() 
        };
        
        // If no valid nodes in chain, skip
        if chain_ids.is_empty() { 
            // eprintln!("[bridge] empty chain after filtering, original chain len: {}", chain.len());
            return; 
        }
        
        let prevented = self.js.dispatch(chain_ids, name, &payload.to_string());
        if prevented { state.prevent_default(); }
        
        let batches = self.js.take_ops();
        if !batches.is_empty() {
            let mut g: DocGuardMut = doc.inner_mut();
            let mut ids = self.ids.borrow_mut();
            for b in batches { apply(&mut *g, &mut ids, &b); }
            event.request_redraw = true;
        }
    }
}