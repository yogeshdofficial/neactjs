use blitz_dom::{ns, BaseDocument, LocalName, NodeId, QualName};
use std::collections::HashMap;

#[derive(Default)]
pub struct IdMap {
    pub fwd: HashMap<u32, NodeId>,
    pub rev: HashMap<NodeId, u32>,
}

fn qn(name: &str) -> QualName { QualName::new(None, ns!(), LocalName::from(name)) }

pub fn apply(doc: &mut BaseDocument, ids: &mut IdMap, batch: &str) {
    let ops: Vec<serde_json::Value> = match serde_json::from_str(batch) { Ok(v) => v, Err(e) => { eprintln!("[host] bad batch: {e}"); return; } };
    
    // Ensure body element is mapped to ID 0
    if !ids.fwd.contains_key(&0) {
        if let Ok(Some(body)) = doc.query_selector("body") { 
            ids.fwd.insert(0, body); 
            ids.rev.insert(body, 0); 
        }
    }
    
    let mut m = doc.mutate();
    for op in ops {
        let a = op.as_array().unwrap();
        let n = |i: usize| a[i].as_u64().unwrap() as u32;
        let s = |i: usize| a[i].as_str().unwrap_or("");
        match a[0].as_u64().unwrap() {
            1 => {
                let id = m.create_element(QualName::new(None, ns!(html), LocalName::from(s(2))), vec![]);
                ids.fwd.insert(n(1), id); ids.rev.insert(id, n(1));
            }
            8 => {
                let id = m.create_text_node(s(2));
                ids.fwd.insert(n(1), id); ids.rev.insert(id, n(1));
            }
            2 => { if let Some(&id) = ids.fwd.get(&n(1)) { m.set_attribute(id, qn(s(2)), s(3)); } }
            7 => { if let Some(&id) = ids.fwd.get(&n(1)) { m.clear_attribute(id, qn(s(2))); } }
            3 => { if let (Some(&p), Some(&c)) = (ids.fwd.get(&n(1)), ids.fwd.get(&n(2))) { m.append_children(p, &[c]); } }
            6 => { if let (Some(&c), Some(&b)) = (ids.fwd.get(&n(2)), ids.fwd.get(&n(3))) { m.insert_nodes_before(b, &[c]); } }
            4 => {
                // Remove element and all its descendants from IdMap
                // First check if node exists in our map
                let Some(&root) = ids.fwd.get(&n(2)) else { continue; };
                
                // Collect all descendant node IDs before any DOM mutation
                let mut all_nodes = Vec::new();
                all_nodes.push(root);
                let mut idx = 0;
                while idx < all_nodes.len() {
                    let node = all_nodes[idx];
                    // Use catch_unwind to handle potential SlotMap errors
                    let children: Vec<NodeId> = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                        m.child_ids(node)
                    })).unwrap_or_default().into_iter().collect();
                    
                    for child in children {
                        all_nodes.push(child);
                    }
                    idx += 1;
                }
                
                // Remove all collected nodes from IdMap
                for node in &all_nodes {
                    if let Some(&our_id) = ids.rev.get(node) {
                        ids.fwd.remove(&our_id);
                        ids.rev.remove(node);
                    }
                }
                
                // Remove root from DOM (children are auto-removed)
                let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    m.remove_and_drop_node_with(root, &mut |_dropped| {});
                }));
            }
            5 => { if let Some(&id) = ids.fwd.get(&n(1)) { m.set_node_text(id, s(2)); } }
            _ => {}
        }
    }
}