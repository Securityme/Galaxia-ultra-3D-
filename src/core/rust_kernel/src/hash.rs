//! GALAXIA ULTRA • Bio-Dôme de Poche (PT-74 Rust Kernel)
//! FNV-1a Bit-Perfect Hash Generator matching TypeScript simulationKernel.ts `computeStateFingerprint`.

use super::types::SimulationStateSnapshot;

pub const FNV_OFFSET_32: u32 = 2166136261;
pub const FNV_PRIME_32: u32 = 16777619;

/// Computes single-byte step for FNV-1a hash.
#[inline]
pub fn fnv1a_step(current_hash: u32, byte_val: u8) -> u32 {
    (current_hash ^ (byte_val as u32)).wrapping_mul(FNV_PRIME_32)
}

/// Computes bit-perfect state fingerprint string matching TS reference `computeStateFingerprint`.
pub fn compute_state_fingerprint(snapshot: &SimulationStateSnapshot) -> String {
    let mut b_strs: Vec<String> = snapshot
        .buildings
        .iter()
        .map(|b| format!("{}:{}:{:.1},{:.1}", b.id, b.building_type, b.x, b.z))
        .collect();
    b_strs.sort();

    let mut n_strs: Vec<String> = snapshot
        .npcs
        .iter()
        .map(|n| format!("{}:{}:{}", n.id, n.name, n.role))
        .collect();
    n_strs.sort();

    let r_strs = vec![
        format!("stability={}", snapshot.resource_stocks.stability.round() as i64),
        format!("prosperity={}", snapshot.resource_stocks.prosperity.round() as i64),
        format!("knowledge={}", snapshot.resource_stocks.knowledge.round() as i64),
        format!("influence={}", snapshot.resource_stocks.influence.round() as i64),
        format!("marble={}", snapshot.resource_stocks.marble.round() as i64),
        format!("basalt={}", snapshot.resource_stocks.basalt.round() as i64),
        format!("crystal={}", snapshot.resource_stocks.crystal.round() as i64),
        format!("biomass={}", snapshot.resource_stocks.biomass.round() as i64),
        format!("energy={}", snapshot.resource_stocks.energy.round() as i64),
        format!("alloy={}", snapshot.resource_stocks.alloy.round() as i64),
        format!("data={}", snapshot.resource_stocks.data.round() as i64),
        format!("parts={}", snapshot.resource_stocks.parts.round() as i64),
    ];

    let canonical_json = format!(
        "{{\"s\":\"{}\",\"t\":{},\"b\":[{}],\"n\":[{}],\"r\":[{}]}}",
        snapshot.seed,
        snapshot.turn_number,
        b_strs.iter().map(|s| format!("\"{}\"", s)).collect::<Vec<_>>().join(","),
        n_strs.iter().map(|s| format!("\"{}\"", s)).collect::<Vec<_>>().join(","),
        r_strs.iter().map(|s| format!("\"{}\"", s)).collect::<Vec<_>>().join(",")
    );

    let mut hash = FNV_OFFSET_32;
    for byte in canonical_json.bytes() {
        hash = fnv1a_step(hash, byte);
    }

    format!("FNV1A-{:08X}", hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fnv1a_hash() {
        let mut h = FNV_OFFSET_32;
        for b in b"TEST" {
            h = fnv1a_step(h, *b);
        }
        assert_ne!(h, FNV_OFFSET_32);
    }
}
