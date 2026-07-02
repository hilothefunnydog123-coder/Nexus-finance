# PROJECT MATRIX // NATIVE
## God-Tier Event-Reaction Trading Client — Full Engineering Specification
**Codename:** OBSIDIAN CORTEX · **Targets:** macOS (Apple Silicon, Metal 3) / Windows (DX12) · **Rev:** 1.0

> **THE PHYSICS CLAUSE (read once, then we go fast).**
> You do not trade "before the Kalshi book updates." The book *is* the exchange —
> the matching engine is the single source of truth and every order becomes public
> the instant it matches. What actually exists — and what this machine is built to
> dominate — is the **reaction gap**: a federal ruling drops on a court RSS feed, a
> hurricane advisory posts to NWS, a scoring play lands in a stadium data feed —
> and the average Kalshi participant takes **20–90 seconds** to reprice it. This
> client reacts in **under 400 milliseconds, end to end**. That is the entire
> edge, it is enormous at Kalshi timescales, it is 100% public-data and 100%
> legal, and everything below is engineered around winning that gap. Every number
> in the latency tables is a real budget, not marketing.

---

# 1. SYSTEM ARCHITECTURE & NATIVE OS RENDERING ENGINE

## 1.1 Process Topology — Four Sovereign Threads, Zero Shared Locks

One process, four pinned worker domains, communicating exclusively over lock-free
SPSC ring buffers. Nothing blocks. Nothing waits on a mutex in the hot path.

```
┌──────────────────────────────────────────────────────────────────────┐
│  MATRIX NATIVE  (single process, Rust core)                          │
│                                                                      │
│  [INGEST]──ring──▶[CORTEX]──ring──▶[EXECUTION]                       │
│     │                │                  │                            │
│     └────────────────┴───────┬──────────┘                            │
│                       events ring (MPSC, 64k slots)                  │
│                              ▼                                       │
│                         [RENDER]  (never touches the network)        │
└──────────────────────────────────────────────────────────────────────┘
```

| Domain | Runtime | Core pinning | Job |
|---|---|---|---|
| **INGEST** | `tokio` multi-thread (2 threads) | P-cores 0–1 | Terminate every websocket/SSE/RSS feed, normalize to a 64-byte `WorldEvent` struct |
| **CORTEX** | Dedicated OS thread, no async | P-core 2 | Feature extraction + swarm/model inference. Deterministic, allocation-free after warmup |
| **EXECUTION** | `tokio` current-thread | P-core 3 | Pre-signed order pipeline → Kalshi REST/WS. Owns the only TLS connections to the exchange |
| **RENDER** | Main thread + GPU queue | E-cores / whatever remains | wgpu frame loop at 120 Hz. Read-only consumer of the events ring |

**Rules of the house:**
- **Rust everywhere in the core.** No GC pauses, no JIT warmup, `#![deny(unsafe_op_in_unsafe_fn)]`, `unsafe` only inside the ring buffer and the GPU staging mapper.
- **Ring buffers:** `crossbeam` SPSC, fixed 64-byte cache-line-aligned slots, rkyv zero-copy serialization. A `WorldEvent` never touches the heap between ingest and execution.
- **Time:** one `quanta` TSC-calibrated clock. Every event carries `t_ingest`, `t_decision`, `t_wire`, `t_ack` — the latency HUD renders honest histograms from these, always on screen. If the machine gets slow, the machine *tells you*.

## 1.2 Shell Strategy — Tauri v2 Hybrid (the correct 2045 answer)

Full native windowing (winit) is purer; nobody ships product UI in it fast. The
architecture that wins:

- **Tauri v2** shell: Rust core runs as described above; the chrome (panels,
  modals, settings) is a webview surface.
- **The Neural Core and the Hyper-Stream ledger do NOT render in the webview.**
  They render in a dedicated **wgpu** child surface (Metal on macOS, DX12 on
  Windows, Vulkan fallback) composited under the webview with a punched-through
  transparent region. UI chrome at webview speed, the living centerpiece at
  native 120 Hz with compute shaders.
- IPC between webview chrome and Rust core: Tauri commands for cold paths;
  a `SharedArrayBuffer`-backed snapshot (prices, positions, PnL — one struct,
  double-buffered, seqlock) for the hot HUD numbers. The webview never asks the
  core a question; it reads the latest published snapshot at its own refresh.

**Frame budget @120 Hz = 8.3 ms:** compute pass (neural graph + particles)
≤ 2.0 ms · geometry/raymarch pass ≤ 2.5 ms · bloom + post ≤ 1.5 ms · ledger text
≤ 1.0 ms · headroom 1.3 ms. The GPU does the theater; the CPU trade path never
yields to rendering — RENDER is a *reader*, and if it drops to 60 Hz under load
the trade path doesn't notice.

## 1.3 Crash Discipline

- EXECUTION domain runs a **dead-man's switch**: heartbeat every 250 ms into the
  ring; if CORTEX stops answering for 2 s → cancel all resting orders, flatten
  per policy, drop to COLD.
- Panic in any domain → `panic = "abort"` + supervisor respawn with positions
  reloaded from the exchange (the exchange is the book of record, never local state).
- Every session writes an append-only `flight-recorder.bin` (rkyv stream of all
  events + decisions) — replayable in the built-in time-machine debugger.

---

# 2. THE BIO-MECHANICAL NEURAL CORE — FULL VISUAL SPECIFICATION

The centerpiece. An obsidian-glass brain, ~140k tris base mesh fused with an SDF
raymarched interior, forged in `#030506` and lit only by its own neurons.

## 2.1 Construction

- **Shell:** low-poly obsidian glass mesh (140k tris, catmull-clark from a 9k
  cage), PBR with IOR 1.46, roughness 0.08, near-zero albedo. It reads as black
  glass until light moves *inside* it.
- **Interior:** a **neural graph of 32,768 nodes / ~98k edges** generated at
  first boot from a Poisson-disk fill of the brain volume, k=3 nearest-neighbor
  wiring, stored as GPU buffers (`nodes: vec4<f32>` position+phase, `edges:
  vec2<u32>`). This graph is *the same data structure the swarm reports into* —
  node clusters are mapped 1:1 to market categories (frontal lobes = Politics/
  Courts, occipital = Sports, temporal = Crypto/Financials, brainstem = Weather/
  Energy). The brain is not decoration; it is a projection of live model state.
- **Pipelines:** one compute pass advances the graph (pulse phases, wavefronts,
  decay), one instanced draw renders edges as anti-aliased quad ribbons with
  additive emission, one for node sprites, then the glass shell, then post.

## 2.2 Post Stack (the "violent precision" look)

No soft bloom haze. The stack is: threshold at 1.4× HDR white → **anamorphic
streak bloom** (horizontal bias 3:1, 5 mips, hard knee) → chromatic aberration
only at screen edges (0.0 center, 0.004 rim) → film grain 1.5% → sRGB. Emissive
ramps are two-stop: `#10d98a` (dark emerald, idle voltage) → `#b6ff3a`
(electric lime, detonation). Nothing in between — transitions snap through a
1-frame white flash `#eaffe9`.

## 2.3 Animation State Machine (exact states, exact timings)

| State | Trigger | Behavior |
|---|---|---|
| **S0 · COLD** | no auth | Graph dark. Shell barely rim-lit by a single cold cyan key light. 0.05 Hz slow rotation. |
| **S1 · IDLE / BREATHING** | authenticated, tape quiet | 2% of nodes pulse at any moment (Poisson λ=650/s across the whole graph). Pulse: node emission 0→0.6→0 over 900 ms, travels to 1-hop neighbors at 0.4 probability. Whole-brain luminance breathes ±8% on an 11 s sine. Rotation 0.1 Hz, camera dolly ±2% on 17 s period. |
| **S2 · INGEST SPIKE** | `WorldEvent` severity ≥ θ | The event's category lobe **detonates**: seed node snaps to 8× HDR white for 1 frame, then a **BFS wavefront** propagates through the cluster via compute shader — one hop per frame (8.3 ms/hop), edge ribbons igniting lime behind the front, decaying back to emerald over 600 ms. 300–1,200 particle sparks (instanced, additive, 0.4 s life, gravity-free drag 0.92) erupt normal to the shell surface above the lobe. Camera does a 0.15° impulse shake (critically damped, 250 ms). Multiple simultaneous events = multiple independent wavefronts; the compute pass supports 16 concurrent fronts. |
| **S3 · DECISION** | CORTEX emits trade intent | The wavefront **converges**: all active fronts redirect down pre-computed spanning-tree paths to the brainstem (execution cluster) over exactly 200 ms, braiding into a single white-hot column. The brainstem ring (a torus of 512 nodes) spins up from 0.2 Hz to 3 Hz. |
| **S4 · EXECUTION FLASH** | order hits the wire | One global frame flash (whole graph +40% luminance, 1 frame), then the brainstem fires a single **shockwave ring** outward along the shell surface (expanding SDF ring, 350 ms, lime edge 2 px). HUD stamps `t_wire→t_ack`. |
| **S5 · POSITION HELD** | fill confirmed | The winning lobe stays lit at 1.5× idle with a slow strobing artery (the "profit vein") pulsing at the position's mark-to-market cadence — green while PnL ≥ 0, shifts blood-red `#ff5a6a` if the position goes against you. You can *see* your book in the meat of the brain. |
| **S6 · LIQUIDATION** | apex exit fires | Profit vein snaps white, drains toward the brainstem as a particle stream (value-proportional count, 60–2,000 particles), ring flash, then a 1.2 s exhale: whole graph luminance +25% decaying to idle. Loss exits drain red, no exhale — the brain just goes quiet. Losses are silent; that's deliberate. |
| **S7 · KILL** | kill switch / dead-man | Every node slams to red for 2 frames, then hard cut to S0 COLD. No animation grace. The kill state must *feel* like a breaker, not a transition. |

**Reduced-motion:** all states collapse to static luminance levels + text
annunciators. The machine respects `prefers-reduced-motion` at the OS level.

---

# 3. THE HYPER-STREAM LEDGER & CUSTOM ICON MATRIX

The waterfall under the brain. A GPU-rendered virtualized log — not DOM — capable
of 240 rows/s sustained without a dropped frame.

## 3.1 Grid & Type

- **Layout:** full-bleed column, `84px` row rhythm at zoom 1.0, three fixed
  tracks: `[44px icon] [1fr payload] [220px verdict]`. Rows are GPU instances;
  scrollback is a 65,536-row ring in a storage buffer.
- **Font stack:** `Berkeley Mono` (licensed) → `JetBrains Mono` → `SF Mono` →
  `ui-monospace`. Data numerals always `font-variant-numeric: tabular-nums`
  (in the GPU text renderer: fixed advance atlas). Two sizes only: 13 px data,
  9 px meta. Uppercase meta at +0.14 em tracking.
- **Row anatomy:**

```
┌──────┬──────────────────────────────────────────────┬───────────────────┐
│ ⟨icon⟩│ 14:03:22.847  NWS·KWBC  ADVISORY №14A        │  Δp̂ +9.2pt        │
│ pulse │ HURRICANE ERIN → CAT 4 · landfall cone shift │  KXHURR-25 · FIRE │
└──────┴──────────────────────────────────────────────┴───────────────────┘
```
  Line 1: timestamp (ms precision, dim) · source tag (category color) · headline
  (ink `#e9f5ee`). Line 2: parsed semantic delta (what the model *extracted*) ·
  affected ticker · disposition chip (`WATCH` dim / `ARM` amber / `FIRE` lime /
  `SKIP` faint).
- **Entry animation:** new row slides in from y-4 px with 1-frame lime underline
  flash; rows that triggered S2+ keep a 2 px left rail in their category color.
  Rows older than 90 s desaturate 40%.

## 3.2 The Icon Matrix — SDF Iconography, One Atlas, Zero Images

All icons are **signed-distance-field glyphs** authored as 2D SDFs in a single
2048² atlas — infinitely sharp at any zoom, tintable, glow-capable (the glow is
just the SDF sampled at a wider threshold, additive).

| Category | Subcategory | Glyph spec | Tint |
|---|---|---|---|
| **GRID/ENERGY** | outage, LMP spike, gas | Jagged 3-segment lightning bolt, 22° rake, hard 90° notch | `#ffd23a` |
| **PHARMA/FDA** | approval, CRL, adcom | Caduceus reduced to a single serpent around a needle, 2 px stroke, drip node at base that actually drips (1 particle/4 s) | `#10d98a` |
| **SPORTS** | NBA / NFL / MLB / soccer | Aggressive angular ball geometries: hexagon-shattered sphere (soccer), 8-slice angular ellipse (football), seam-arc circle (baseball), 4-quadrant slash circle (basketball) | `#2be86a` |
| **COURTS/LAW** | docket, ruling, cert | Gavel abstracted to a falling T-mass 1 frame from impact, motion-line SDF baked in | `#8bffd0` |
| **WEATHER** | hurricane, tornado, temp | Logarithmic spiral with hard-cut eye (hurricane); nested chevrons (front) | `#5cf2ff` |
| **CRYPTO** | BTC/ETH strikes | ₿ re-drawn on a 45° shear grid, terminals cut at 90° | `#ffd23a` |
| **FED/MACRO** | FOMC, CPI, NFP | Marble column cracked by a lightning fissure down center | `#10d98a` |
| **FLIGHT/TRANSPONDER** | tail-number watch | Swept-wing delta with ADS-B ping rings (2 expanding SDF circles) | `#22d3ee` |
| **POLITICS** | polls, filings | Scale beam tipped 12° off level — never balanced | `#b6ff3a` |
| **EXCHANGE/SELF** | fills, exits, kills | The Matrix brainstem torus glyph | `#e9f5ee` |

Disposition chips reuse the same SDF pipeline: `FIRE` is a chevron-burst, `SKIP`
a broken circle, `KILL` a solid octagon. Icons pulse (SDF glow width 0→3 px→0,
300 ms) when their row's event crosses the severity threshold.

## 3.3 The Ingest Engine Behind the Ledger (the Hivemind, honestly specced)

Every source below is **public data**. Speed is the edge, not access.

| Feed | Transport | Normal cadence | Our reaction target |
|---|---|---|---|
| NWS/NOAA advisories (satellite-derived) | SSE + polling CAP/ATOM, 2 regional POPs | posts in bursts | parse ≤ 5 ms |
| Federal court dockets (PACER RSS, CourtListener webhooks) | webhook + 15 s poll | minutes-scale | parse ≤ 8 ms |
| Stadium/league live data (licensed sportsfeeds) | websocket | 1–3 s per play | parse ≤ 3 ms |
| ADS-B flight transponders (adsb.lol/OpenSky) | websocket firehose, geofenced | 1 s | filter ≤ 2 ms |
| Kalshi market data (public WS: book deltas, trades) | websocket ×2 (redundant) | real-time | apply ≤ 1 ms |
| Wire headlines (RSS cluster, dedup via simhash) | poll 1–5 s | seconds | dedup+parse ≤ 6 ms |

Each feed terminates in INGEST as a `WorldEvent { t_ingest, category, entity,
severity, payload_hash, deltas[] }`. A **watchlist compiler** maintains the map
from entities (storm names, docket numbers, team codes, strike levels) →
Kalshi tickers, refreshed every 30 s from `/events`, so the CORTEX lookup at
event time is a flat hash probe, not an API call.

*(There are no "dark pools" on Kalshi — it's a single transparent CLOB. The
equivalent telemetry here is our own **book-velocity tracker**: full-depth
deltas timestamped and differentiated to detect when the crowd arrives.)*

---

# 4. THE MILLISECOND EXECUTION & LIQUIDATION PROTOCOL

## 4.1 The honest wire math

Kalshi's matching engine lives in AWS **us-east**. Physics prices the round trip:

| Client location | TLS-resumed HTTPS RTT to exchange |
|---|---|
| Same-region VPS (the pro move: EXECUTION domain can run headless there, UI at home streams state) | **3–12 ms** |
| Home fiber, US east coast | 15–40 ms |
| Home, west coast | 60–90 ms |

The public "whisper gap" we're racing is 20–90 **seconds**. Our budget makes the
network irrelevant either way. Rate limits (per-tier, ~10–30 orders/s) are
enforced client-side by a token bucket *below* the strategy layer — the strategy
can scream; the gateway never violates.

## 4.2 The packet's journey — microsecond-resolved timeline

**T+0.000 ms — THE EVENT.** NWS advisory hits our SSE socket: Erin upgraded,
cone shifted east. Kernel wakes INGEST.

**T+0.9 ms — NORMALIZE.** Zero-copy parse (simd-json), entity extraction against
the compiled watchlist: `ERIN → [KXHURR-25SEP-TAMPA, KXHURR-25SEP-MIA…]`.
`WorldEvent` written to the CORTEX ring. Brain: **S2 detonation begins** (render
picks it up on its next frame, ≤ 8.3 ms later — the flare you see *is* the packet).

**T+1.1 ms — FEATURES.** CORTEX pops the event. Feature vector assembled
allocation-free: advisory deltas + current book state (bid/ask/depth/velocity,
already resident from the market-data WS) + swarm conviction + time-to-close.

**T+1.6 ms — INFERENCE.** Two-stage: (1) deterministic rules table for
category-critical events (a CAT upgrade inside the cone = immediate directional
mandate, no model needed — rules are O(1) and audited); (2) the 262k-agent hedge
swarm + gradient-boosted calibrator (ONNX Runtime, in-process, 4-thread) emits
`p̂ = 0.71` vs book `0.58`. Net edge after fees/spread: +9.2 pt. **Mandate: BID.**

**T+1.8 ms — RISK GATE.** Position limits, category exposure, session budget,
token bucket, kill-switch flag — six compare-and-branch checks, one cache line.

**T+2.0 ms — SIGN & FIRE.** Order struct → canonical JSON (pre-allocated
buffer) → **RSA-PSS-SHA256 signature ≈ 0.8–1.5 ms** (2048-bit, `ring`, private
key held in OS keychain/Secure Enclave-wrapped memory, never on disk plaintext).
Connection is already hot: TLS 1.3 session-resumed, HTTP/2 keep-alive pinged
every 15 s. `POST /trade-api/v2/portfolio/events/orders` — single-book V2
schema, `side: bid`, fixed-point price crossed +5¢, `time_in_force:
immediate_or_cancel`. **Total client compute: ~3.5 ms from photon to wire.**

**T+2 ms + RTT (≈5–40 ms) — ACK.** Fill confirmation. Brain: **S4 flash**, HUD
stamps the honest number (`t_wire→t_ack: 11.3 ms`). Ledger row flips to `FILLED`.

**T+20–90 seconds — THE CROWD ARRIVES.** This is the actual game. The book-
velocity tracker watches the public reprice: trade-tape imbalance EWMA (α=0.2),
book-pressure derivative, and price velocity `v = dp/dt` over 5 s windows.

**APEX DETECTION — the inflection lock.** Liquidate on the *earliest* of:
1. **Momentum apex:** `v` crosses below 0.35 × its own peak while cumulative
   move ≥ 60% of model target (second-derivative sign flip + volume fade) —
   the crowd's push is exhausting;
2. **Target:** mark reaches `p̂` minus half-spread — our number, done;
3. **Thesis break:** contradicting `WorldEvent` (cone shifts back) — exit at
   market, no debate;
4. **Time stop:** category-tuned max hold (weather 45 min, sports in-game 90 s);
5. **Hard stop:** −25% on premium. Always armed, never widened.

**T+apex — LIQUIDATE.** Reduce-only ask, IOC, crossed −5¢, same signed pipeline.
Brain: **S6 profit drain**, particle stream mass-proportional to realized PnL.
Position flat, session ledger updated, core exhales to S1. The flight recorder
has the entire life of the trade in rkyv frames for replay.

**T+∞ — LEARN.** The realized path (entry → apex → exit) is fed back as a
training example: the swarm's hedge weights already updated live; the apex
detector's peak-fraction threshold anneals per category (bandit over {0.25,
0.35, 0.5}). The machine gets sharper every trade it survives.

## 4.3 Failure Doctrine

- Reject/rate-limit → single retry at +1¢ cross, then stand down that ticker 60 s.
- WS market-data gap > 3 s → positions marked stale, exits switch to book-less
  conservative mode (time stops halve).
- Two consecutive sell failures → dead-man flatten-all + drop to COLD + red S7.
- Every kill path is testable from a chaos menu in dev builds. If you haven't
  fired the kill switch in anger, you don't own a kill switch.

---

# 5. BUILD PHASING (so this ships instead of staying a render)

| Phase | Deliverable | Exit criterion |
|---|---|---|
| **P0** | Existing web terminal (`/terminal`) = reference implementation: swarm, V2 order pipeline, browser-held keys — **already live** | it trades |
| **P1** | Tauri shell wrapping the web terminal + native keychain custody + hot TLS gateway in Rust | order round-trip < 25 ms from home |
| **P2** | wgpu Neural Core surface (S0–S7 complete) + GPU ledger | 120 Hz sustained with 240 rows/s |
| **P3** | Ingest hivemind (weather + courts + sports + ADS-B) + watchlist compiler | event→wire < 5 ms in flight recorder |
| **P4** | Apex liquidation engine + per-category bandit annealing | 30-session paper record, then judge it like adults |

---

*MATRIX NATIVE trades public information faster than the public. It does not see
orders before the exchange does, it does not need to, and anything that claims
otherwise is selling you a screensaver. This is the version that's real — which
is exactly what makes it terrifying.*
