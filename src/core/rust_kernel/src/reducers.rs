//! GALAXIA ULTRA • Bio-Dôme de Poche (PT-74 Rust Kernel)
//! Pure simulation reducers (tick, resource clamping, rhythm arbitration, latent effect resolution).

use super::types::{ResourceStockMap, SimulationStateSnapshot};

pub const TICK_HZ: f64 = 10.0;
pub const CELESTIAL_CYCLE_RATE: f64 = 0.04;

/// Advances celestial day/night cycle deterministically by 1 fixed tick (10 Hz).
#[inline]
pub fn advance_tick(celestial_time: f64, auto_cycle: bool) -> f64 {
    if !auto_cycle {
        return celestial_time;
    }
    let dt_fixed = 1.0 / TICK_HZ;
    let next = (celestial_time + dt_fixed * CELESTIAL_CYCLE_RATE * 0.2) % 1.0;
    (next * 100000.0).round() / 100000.0
}

/// Clamps resource value according to family boundary rules (Imperial 0..100, Material/Tech 0..999).
#[inline]
pub fn clamp_resource_value(current: f64, delta: f64, is_imperial: bool) -> f64 {
    let raw = (current + delta).round();
    if is_imperial {
        raw.clamp(0.0, 100.0)
    } else {
        raw.clamp(0.0, 999.0)
    }
}

/// Arbitrates offline simulation ticks according to max offline limit (rhythm arbitration).
pub fn arbitrate_rhythm_ticks(pending_ticks: i32, max_offline_hours: i32) -> i32 {
    if pending_ticks <= 0 {
        return 0;
    }
    let max_ticks = max_offline_hours * 3600 * (TICK_HZ as i32);
    pending_ticks.min(max_ticks)
}

/// Resolves due latent scheduled effects in the state snapshot.
pub fn resolve_pending_effects(snapshot: &mut SimulationStateSnapshot) -> Vec<String> {
    let current_turn = snapshot.turn_number;
    let current_tick = snapshot.tick_index;

    let (due, remaining): (Vec<_>, Vec<_>) = snapshot
        .pending_effects
        .drain(..)
        .partition(|pe| pe.due_turn <= current_turn || pe.due_tick <= current_tick);

    snapshot.pending_effects = remaining;

    due.into_iter()
        .map(|pe| format!("[Effet Latent T{}] {}", pe.origin_turn, pe.hint))
        .collect()
}
