# YN Copilot for TradingView

An AI trading copilot that lives in your browser and wakes up **only inside TradingView**.
Talk to it or type to it — it reads your chart, marks levels, points out structure, and writes indicators.

## Install (Load Unpacked — 30 seconds)
1. Download / clone this `extension/` folder.
2. Open **chrome://extensions** (or edge://extensions).
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** → select this `extension/` folder.
5. Open a chart at **tradingview.com/chart** — the copilot wakes automatically (or press **Alt+Y**).

## What it does today (v1)
- **Activates only on TradingView.** The toolbar badge turns green ● when you're on a chart; it's dormant everywhere else.
- **Talk or type.** Click 🎤 to speak, or type. Toggle "🔊 speak replies" for voice-back.
- **Reads your chart.** Detects the symbol + timeframe and pulls live data from the YN backend (Finnhub).
- **Draws levels & callouts** on a reliable overlay canvas — PDH/PDL, EMAs, anything you ask for.
  > One-time **Calibrate** (click two points, type their prices) lets it place levels precisely. Re-calibrate after a big zoom.
- **Writes indicators.** Ask for a Pine script; it generates valid Pine v5 and pastes it into the editor (or copies to clipboard).
- **Routines.** Save a macro per symbol (e.g. "Morning levels") and run it with `run Morning levels`.

## Settings
- Click the ⚙ in the panel to set the **API base URL** (default `https://ynfinance.org`; use `http://localhost:3000` for local dev).

## Honest limitations (v1)
- Drawings live on an **overlay** the extension controls — they are not (yet) native TradingView objects, so they don't persist in your TV layout. Native-object drawing is on the roadmap (brittle, TV-version dependent).
- The overlay needs a one-time **calibration** because TradingView renders its price axis to a canvas we can't read directly.
- Automating a third-party site is assistive-only — don't use it for bulk/abusive automation (TradingView ToS).

## Architecture
`content.js` (the hands, in your tab) ⇄ `background.js` (activation + hotkey) ⇄ **YN backend** `/api/copilot/agent` (the brain: Gemini + live market data → a JSON action plan the content script executes).
