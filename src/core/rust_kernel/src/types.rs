//! GALAXIA ULTRA • Bio-Dôme de Poche (PT-74 Rust Kernel)
//! Types & Schemas mirroring simulation kernel state for WebAssembly bindings.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ResourceStockMap {
    pub stability: f64,
    pub prosperity: f64,
    pub knowledge: f64,
    pub influence: f64,
    pub marble: f64,
    pub basalt: f64,
    pub crystal: f64,
    pub biomass: f64,
    pub energy: f64,
    pub alloy: f64,
    pub data: f64,
    pub parts: f64,
}

impl Default for ResourceStockMap {
    fn default() -> Self {
        Self {
            stability: 62.0,
            prosperity: 58.0,
            knowledge: 50.0,
            influence: 48.0,
            marble: 40.0,
            basalt: 45.0,
            crystal: 25.0,
            biomass: 50.0,
            energy: 35.0,
            alloy: 28.0,
            data: 30.0,
            parts: 24.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlacedBuildingRecord {
    pub id: String,
    pub building_type: String,
    pub name: String,
    pub x: f64,
    pub z: f64,
    pub tier: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlacedNpcRecord {
    pub id: String,
    pub name: String,
    pub role: String,
    pub mood: String,
    pub x: f64,
    pub z: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ScheduledPendingEffectRecord {
    pub id: String,
    pub origin_turn: u32,
    pub due_turn: u32,
    pub due_tick: u32,
    pub origin_event_title: String,
    pub hint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SimulationStateSnapshot {
    pub seed: String,
    pub turn_number: u32,
    pub tick_index: u32,
    pub celestial_time: f64,
    pub auto_cycle_time: bool,
    pub buildings: Vec<PlacedBuildingRecord>,
    pub npcs: Vec<PlacedNpcRecord>,
    pub resource_stocks: ResourceStockMap,
    pub pending_effects: Vec<ScheduledPendingEffectRecord>,
}
