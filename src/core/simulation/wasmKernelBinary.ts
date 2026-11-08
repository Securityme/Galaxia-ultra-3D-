/**
 * GALAXIA ULTRA • Bio-Dôme de Poche
 * PT-74 — Pre-compiled WASM Binary Bytecode & Loader (Asset ast_wasm_sim_kernel_v4_0_0)
 *
 * Provides standalone WebAssembly instantiation without requiring external fetch network calls or build-time Rust compilers.
 */

function uleb128(val: number): number[] {
  const bytes: number[] = [];
  let v = val;
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (v !== 0);
  return bytes;
}

function sleb128(val: number): number[] {
  const bytes: number[] = [];
  let v = val;
  let more = true;
  while (more) {
    let byte = v & 0x7f;
    v >>= 7;
    const signBit = (byte & 0x40) !== 0;
    if ((v === 0 && !signBit) || (v === -1 && signBit)) {
      more = false;
    } else {
      byte |= 0x80;
    }
    bytes.push(byte);
  }
  return bytes;
}

function f64Bytes(val: number): number[] {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, val, true);
  return Array.from(new Uint8Array(buf));
}

function strBytes(str: string): number[] {
  const enc = new TextEncoder().encode(str);
  return [...uleb128(enc.length), ...enc];
}

function section(id: number, payload: number[]): number[] {
  return [id, ...uleb128(payload.length), ...payload];
}

/**
 * Generates the versioned PT-74 WASM simulation kernel module binary.
 */
export function buildWasmKernelBinary(): Uint8Array {
  // Types:
  // 0: () -> i32
  // 1: (f64, i32) -> f64
  // 2: (f64, f64, i32) -> f64
  // 3: (i32, i32) -> i32
  const typePayload = [
    ...uleb128(4),
    // Type 0: () -> i32
    0x60, 0x00, 0x01, 0x7f,
    // Type 1: (f64, i32) -> f64
    0x60, 0x02, 0x7c, 0x7f, 0x01, 0x7c,
    // Type 2: (f64, f64, i32) -> f64
    0x60, 0x03, 0x7c, 0x7c, 0x7f, 0x01, 0x7c,
    // Type 3: (i32, i32) -> i32
    0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,
  ];

  // Function section: 5 functions matching types [0, 1, 2, 3, 3]
  const funcPayload = [...uleb128(5), 0x00, 0x01, 0x02, 0x03, 0x03];

  // Export section:
  const exportPayload = [
    ...uleb128(5),
    ...strBytes('sim_kernel_version'), 0x00, 0x00,
    ...strBytes('sim_advance_tick'), 0x00, 0x01,
    ...strBytes('sim_clamp_resource'), 0x00, 0x02,
    ...strBytes('sim_fnv1a_step'), 0x00, 0x03,
    ...strBytes('sim_arbitrate_rhythm'), 0x00, 0x04,
  ];

  // Function 0: () -> i32 (version 400)
  const f0Body = [
    0x00, // 0 locals
    0x41, ...sleb128(400),
    0x0b,
  ];

  // Function 1: (f64 celestial_time, i32 auto_cycle) -> f64
  // advance_tick formula
  const f1Body = [
    ...uleb128(1), ...uleb128(1), 0x7c, // 1 local f64
    0x20, 0x01, // local.get 1 (auto_cycle)
    0x45, // i32.eqz
    0x04, 0x7c, // if (result f64)
      0x20, 0x00, // local.get 0
    0x05, // else
      0x20, 0x00,
      0x44, ...f64Bytes(0.0008), // f64.const 0.0008 (dt_fixed * CELESTIAL_CYCLE_RATE * 0.2)
      0xa0, // f64.add
      0x21, 0x02, // local.set 2
      0x20, 0x02,
      0x20, 0x02,
      0x8b, // f64.floor
      0xa1, // f64.sub
    0x0b,
    0x0b,
  ];

  // Function 2: (f64 current, f64 delta, i32 is_imperial) -> f64
  // clamp_resource formula
  const f2Body = [
    ...uleb128(1), ...uleb128(1), 0x7c, // 1 local f64 (index 3: val)
    0x20, 0x00,
    0x20, 0x01,
    0xa0, // f64.add
    0x8c, // f64.nearest / round
    0x21, 0x03,
    // if val < 0 => 0
    0x20, 0x03,
    0x44, ...f64Bytes(0.0),
    0x9d, // f64.lt
    0x04, 0x40,
      0x44, ...f64Bytes(0.0),
      0x21, 0x03,
    0x0b,
    // if is_imperial != 0
    0x20, 0x02,
    0x04, 0x7c,
      0x20, 0x03,
      0x44, ...f64Bytes(100.0),
      0x9f, // f64.gt
      0x04, 0x7c,
        0x44, ...f64Bytes(100.0),
      0x05,
        0x20, 0x03,
      0x0b,
    0x05, // else
      0x20, 0x03,
      0x44, ...f64Bytes(999.0),
      0x9f, // f64.gt
      0x04, 0x7c,
        0x44, ...f64Bytes(999.0),
      0x05,
        0x20, 0x03,
      0x0b,
    0x0b,
    0x0b,
  ];

  // Function 3: (i32 hash, i32 byte_val) -> i32
  // fnv1a_step: (hash ^ byte_val) * 16777619
  const f3Body = [
    0x00, // 0 locals
    0x20, 0x00,
    0x20, 0x01,
    0x73, // i32.xor
    0x41, ...sleb128(16777619),
    0x6c, // i32.mul
    0x0b,
  ];

  // Function 4: (i32 pending_ticks, i32 max_offline_hours) -> i32
  // arbitrate_rhythm_ticks: min(pending_ticks, max_offline_hours * 3600 * 10)
  const f4Body = [
    ...uleb128(1), ...uleb128(1), 0x7f, // local max_ticks (index 2)
    0x20, 0x00,
    0x41, 0x00,
    0x48, // i32.lt_s
    0x04, 0x7f,
      0x41, 0x00,
    0x05,
      0x20, 0x01,
      0x41, ...sleb128(36000), // 3600 * 10
      0x6c, // i32.mul
      0x21, 0x02,
      0x20, 0x00,
      0x20, 0x02,
      0x4a, // i32.gt_s
      0x04, 0x7f,
        0x20, 0x02,
      0x05,
        0x20, 0x00,
      0x0b,
    0x0b,
    0x0b,
  ];

  const codePayload = [
    ...uleb128(5),
    ...uleb128(f0Body.length), ...f0Body,
    ...uleb128(f1Body.length), ...f1Body,
    ...uleb128(f2Body.length), ...f2Body,
    ...uleb128(f3Body.length), ...f3Body,
    ...uleb128(f4Body.length), ...f4Body,
  ];

  return new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    ...section(1, typePayload),
    ...section(3, funcPayload),
    ...section(7, exportPayload),
    ...section(10, codePayload),
  ]);
}

export interface WasmSimKernelInstanceExports {
  sim_kernel_version: () => number;
  sim_advance_tick: (celestialTime: number, autoCycle: number) => number;
  sim_clamp_resource: (current: number, delta: number, isImperial: number) => number;
  sim_fnv1a_step: (currentHash: number, byteVal: number) => number;
  sim_arbitrate_rhythm: (pendingTicks: number, maxOfflineHours: number) => number;
}

let cachedInstance: WasmSimKernelInstanceExports | null = null;

export function getWasmKernelInstance(): WasmSimKernelInstanceExports | null {
  if (cachedInstance) return cachedInstance;
  try {
    if (typeof WebAssembly === 'undefined') return null;
    const bytes = buildWasmKernelBinary();
    const buffer = bytes.buffer as ArrayBuffer;
    if (!WebAssembly.validate(buffer)) return null;

    const module = new WebAssembly.Module(buffer);
    const instance = new WebAssembly.Instance(module);
    cachedInstance = instance.exports as unknown as WasmSimKernelInstanceExports;
    return cachedInstance;
  } catch (err) {
    console.warn('[WASM Bridge] WebAssembly instantiation fallback:', err);
    return null;
  }
}
