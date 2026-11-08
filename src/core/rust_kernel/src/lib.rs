//! GALAXIA ULTRA • Bio-Dôme de Poche (PT-74 Rust Kernel)
//! Main WebAssembly exported interface & bridge functions.

pub mod hash;
pub mod reducers;
pub mod types;

use hash::{compute_state_fingerprint, fnv1a_step, FNV_OFFSET_32};
use reducers::{advance_tick, arbitrate_rhythm_ticks, clamp_resource_value, resolve_pending_effects};
use types::SimulationStateSnapshot;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn sim_kernel_version() -> u32 {
    400 // Version 4.0.0
}

#[wasm_bindgen]
pub fn sim_advance_tick(celestial_time: f64, auto_cycle: bool) -> f64 {
    advance_tick(celestial_time, auto_cycle)
}

#[wasm_bindgen]
pub fn sim_clamp_resource(current: f64, delta: f64, is_imperial: bool) -> f64 {
    clamp_resource_value(current, delta, is_imperial)
}

#[wasm_bindgen]
pub fn sim_arbitrate_rhythm(pending_ticks: i32, max_offline_hours: i32) -> i32 {
    arbitrate_rhythm_ticks(pending_ticks, max_offline_hours)
}

#[wasm_bindgen]
pub fn sim_fnv1a_step(current_hash: u32, byte_val: u8) -> u32 {
    fnv1a_step(current_hash, byte_val)
}

#[wasm_bindgen]
pub fn sim_compute_fingerprint(js_snapshot_val: JsValue) -> Result<String, JsValue> {
    let snapshot: SimulationStateSnapshot = serde_wasm_bindgen::from_value(js_snapshot_val)?;
    Ok(compute_state_fingerprint(&snapshot))
}

#[wasm_bindgen]
pub fn sim_resolve_latents(js_snapshot_val: JsValue) -> Result<JsValue, JsValue> {
    let mut snapshot: SimulationStateSnapshot = serde_wasm_bindgen::from_value(js_snapshot_val)?;
    let triggered = resolve_pending_effects(&mut snapshot);
    let res = serde_wasm_bindgen::to_value(&(snapshot, triggered))?;
    Ok(res)
}
