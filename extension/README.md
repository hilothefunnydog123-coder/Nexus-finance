# YN Copilot for TradingView

An AI trading copilot that lives in your browser and wakes up **only inside TradingView**.
Talk to it or type to it — it reads your chart, marks levels, points out structure, and writes indicators.

## Install (Load Unpacked — 30 seconds)
1. Download / clone this `extension/` folder.
2. Open **chrome://extensions** (or edge://extensions).
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** → select this `extension/` folder.
5. Open a chart at **tradingview.com/chart** — the copilot wakes automatically (or press **Alt+Y**).

## What it does (v3 — real automation)
- **Activates only on TradingView.** The toolbar badge turns green ● when you're on a chart; it's dormant everywhere else.
- **Talk or type.** Click 🎤 to speak, or type. Toggle "🔊 speak replies" for voice-back.
- **Reads the REAL price** off your chart (the actual instrument — not a proxy).
- **Draws NATIVE TradingView lines** — it uses real, trusted input (Chrome's debugger API) to arm the horizontal-line tool and click at the exact price. No calibration; it reads the price scale itself.
- **Writes, adds & refines indicators.** Ask for a Pine script → it opens the Pine editor, pastes the code, clicks **Add to chart**, reads any compiler error, and **fixes it automatically** (up to 2 passes).
- **Routines.** Save a macro per symbol (e.g. "Morning levels") and run it with `run Morning levels`.
- **Draggable + resizable panel.** Drag it by the header, resize from the bottom-right corner; position is remembered.

## Settings
- Click the ⚙ in the panel to set the **API base URL** (default `https://ynfinance.org`; use `http://localhost:3000` for local dev).

## How the real automation works (and the one tradeoff)
To genuinely click & type in TradingView, the extension uses Chrome's **debugger API** (DevTools Protocol) to send *trusted* input — TradingView can't tell it from a human. While it's acting, **Chrome shows a "YN Copilot started debugging this browser" bar at the top** — that's required and unavoidable; leave it up. If you dismiss it, the copilot falls back to a visual overlay. TradingView's UI is undocumented, so if a specific click misses, it'll say so. Assistive use only — please respect TradingView's ToS.

## Architecture
`content.js` (the hands, in your tab) ⇄ `background.js` (activation + hotkey) ⇄ **YN backend** `/api/copilot/agent` (the brain: Gemini + live market data → a JSON action plan the content script executes).
