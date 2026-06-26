# YN Copilot for TradingView

A **real autonomous AI agent** that lives in your browser and wakes up **only inside TradingView**.
Talk to it or type to it — it *sees* your chart (screenshots), reasons one step at a time, and drives the
UI itself: clicking, typing, drawing levels, opening the Pine editor, pasting code, testing it, and refining
until it works. Not a script of canned actions — a perceive → reason → act loop with eyes on the screen.

## Install (Load Unpacked — 30 seconds)
1. Download / clone this `extension/` folder.
2. Open **chrome://extensions** (or edge://extensions).
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** → select this `extension/` folder.
5. Open a chart at **tradingview.com/chart** — the copilot wakes automatically (or press **Alt+Y**).

## What it does (v5 — the cockpit)
- **Activates only on TradingView.** The toolbar badge turns green ● when you're on a chart; it's dormant everywhere else.
- **You watch it think.** A live **SEEING** strip shows the screenshots it's actually looking at, and an **execution plan** ticks itself off as it works. Final analysis comes back as clean markdown. There's a **stop** button any time.
- **It actually sees the screen.** Every step it screenshots the chart and feeds it to the brain (Gemini vision), so it decides from what's *really* there — not assumptions.
- **Bigger toolset.** Draw exact levels (one or many at once), **change timeframe**, **switch symbol**, **add indicators** (RSI/VWAP/…), clear drawings, and write+test+refine Pine — it does each itself.
- **It finds and clicks things itself.** It scans the page for the right control (e.g. the Pine editor tab), then clicks with real trusted input. No coordinates to calibrate.
- **Talk or type.** Click 🎤 to speak, or type the goal. Toggle "🔊 speak replies" for voice-back.
- **Reads the REAL price** off your chart (the actual instrument — not a proxy).
- **Draws NATIVE TradingView lines** at exact prices — it arms the horizontal-line tool and clicks the price itself, auto-mapping the price scale from the crosshair.
- **Writes, adds, tests & refines indicators end-to-end.** Ask for a Pine script → it opens the Pine editor, pastes the code, clicks **Add to chart**, reads the compiler console, and **fixes errors itself**, looping until it compiles clean.
- **Step-by-step, out loud.** It narrates each move ("· looking at the chart", "· clicking Pine Editor") so you can watch it think.
- **Routines.** Save a goal per symbol (e.g. "Morning levels") and run it with `run Morning levels`.
- **Draggable + resizable panel.** Drag it by the header, resize from the bottom-right corner; position is remembered.

## Settings
- Click the ⚙ in the panel to set the **API base URL** (default `https://ynfinance.org`; use `http://localhost:3000` for local dev).

## How the real automation works (and the one tradeoff)
To genuinely click, type & screenshot in TradingView, the extension uses Chrome's **debugger API** (DevTools Protocol) to send *trusted* input and capture the screen — TradingView can't tell it from a human. While it's acting, **Chrome shows a "YN Copilot started debugging this browser" bar at the top** — that's required and unavoidable; leave it up. If you dismiss it, the agent loses its hands and eyes and will say so. TradingView's UI is undocumented, so if a specific click misses, it perceives that (next screenshot) and tries another way. Assistive use only — please respect TradingView's ToS.

## Architecture
`content.js` (the agent's hands + eyes, in your tab) ⇄ `background.js` (activation, hotkey, and the CDP bridge for trusted clicks/keys/screenshots) ⇄ **YN backend** `/api/copilot/step` (the brain: a stateless ReAct step — Gemini 2.5 Flash with vision picks ONE tool per step; the content script executes it, reports the result + a fresh screenshot, and the loop repeats until the goal is done).
