# Lobby Visualizer — improvement backlog

Saved for later. When you ask *“what should we work on?”*, pick from here (or say *“next item”* / *“do P1 #3”*).

**Status key:** `[ ]` todo · `[~]` in progress · `[x]` done

---

## P0 — Bugs & reliability

| # | Item | Notes |
|---|------|--------|
| 1 | `[~]` **Fix Flow Field shader** | Regressed 2026-06-08: white blowout from additive overflow (12k+ large particles, bloom, trails). Fixed density scaling, point-size clamp, particle-count mapping. |
| 2 | `[ ]` **Verify Spiro on production** | Orbit/trail math fixed locally (2026-06-03); smoke-test on Netlify after deploy. |
| 3 | `[ ]` **Netlify ↔ GitHub continuous deploy** | Site is CLI-deployed; `build_settings` empty. Link `muffinmaker/lobby-visualizer-s2626` in Netlify UI so pushes to `main` auto-build. |
| 4 | `[ ]` **Refresh `gh` auth** | Keyring token invalid; run `gh auth refresh -h github.com` before push/PR workflows. |

---

## P1 — Shader & visual quality

| # | Item | Notes |
|---|------|--------|
| 5 | `[x]` **Spocks GPU budget** | Optional “lobby safe” preset: lower iterations, trails off, capped DPR. Document in tutorial. |
| 6 | `[x]` **Kaleidoscope polish** | More presets using multi-shape morph; optional color themes per segment. |
| 7 | `[ ]` **Metaballs & Ribbons tuning** | Fewer “dead” slider ranges; stronger response from global Speed / Brightness / Bloom. |
| 8 | `[ ]` **New shader ideas** | e.g. audio spectrum bars, simple mandala, reaction-diffusion, or port another J04-style pattern. |
| 9 | `[ ]` **Palette system** | Shared color themes across shaders (not only per-shader RGB sliders). |

---

## P2 — Controls & UX

| # | Item | Notes |
|---|------|--------|
| 10 | `[ ]` **Transport bar clarity** | ◀ and ▶ both trigger random preset — differentiate (e.g. random prev vs random next) or relabel. |
| 11 | `[~]` **Saved presets UX** | Save prompts for name + overwrite confirm; list/rename/delete in UI still todo. |
| 12 | `[ ]` **Export / import presets** | JSON download/upload for backup and sharing between machines. |
| 13 | `[ ]` **Share preset via URL** | Encode preset + shader in query/hash for one-link lobby setups. |
| 14 | `[ ]` **Logo overlay controls** | Size, corner position, opacity (logos exist in settings; bottom-left chrome was removed). |
| 15 | `[ ]` **Kiosk / lobby mode** | Optional: start fullscreen, hide cursor after idle, optional auto-enable Auto Cycle + Music Mode. |
| 16 | `[ ]` **Keyboard shortcut sheet** | Document transport bar, save (💾), and preset keys in tutorial. |
| 17 | `[ ]` **Settings panel on small screens** | Scroll/touch-friendly layout for tablet ops during live events. |

---

## P3 — Music Mode

| # | Item | Notes |
|---|------|--------|
| 18 | `[ ]` **Per-shader music mappings** | Extend beyond current targets; expose which uniforms are driven in UI. |
| 19 | `[ ]` **Sensitivity profiles** | Chill / Normal / Aggressive multipliers for mic vs tab audio. |
| 20 | `[ ]` **Beat / onset detection** | Short pulses on Bloom or Scale instead of only smoothed energy. |
| 21 | `[ ]` **Music + Auto Cycle** | Option to advance preset on phrase boundaries or timed + audio hybrid. |

---

## P4 — Performance & display

| # | Item | Notes |
|---|------|--------|
| 22 | `[ ]` **Adaptive resolution** | Auto-lower Resolution % if frame time exceeds budget for N seconds. |
| 23 | `[ ]` **Shader-specific quality caps** | Spocks already throttles trails/DPR — generalize pattern for Flow particle cap. |
| 24 | `[ ]` **Wake Lock API** | Prevent screen sleep during long lobby runs (where supported). |
| 25 | `[ ]` **Multi-monitor hint** | README note: open on projector display, F11 fullscreen on that screen. |

---

## P5 — Content & presets

| # | Item | Notes |
|---|------|--------|
| 26 | `[x]` **More built-in presets** | Five curated presets per shader (spocks, spiro, kaleido, flow, metaballs, ribbons). |
| 27 | `[ ]` **Preset tags or folders** | Group by event, client, or mood in lil-gui. |
| 28 | `[ ]` **J04 reference fidelity** | Side-by-side checklist vs original OF app (colors, trail feel, default params). |

---

## P6 — Docs & project hygiene

| # | Item | Notes |
|---|------|--------|
| 29 | `[ ]` **README expansion** | GitHub URL, Netlify link, deploy steps, keyboard shortcuts, lobby setup checklist. |
| 30 | `[ ]` **Commit `.gitignore` cleanup** | `.netlify` local folder entry if not already pushed. |
| 31 | `[ ]` **CHANGELOG** | Light release notes when shipping batches of improvements. |

---

## Icebox (nice someday)

- OSC / MIDI / sACN for lighting desk integration  
- Second display “control only” view (settings on laptop, clean output on projector)  
- Custom shader hot-reload from `shaders/custom/` without rebuild  
- PWA install + offline cached assets  
- Screenshot / record short clip for social previews  

---

## Done (archive)

_Move items here when shipped._

| # | Item | Done |
|---|------|------|
| — | Spiro particle geometry fix (black screen) | prior session |
| — | Spiro in-view orbits, slider defaults, trail visibility | 2026-06-03 |
| — | Spiro pen-orbit rewrite: square pens, stable colors, motion trails | 2026-06-03 |
| — | Kaleido mirrors, multi-shape morph, global uniform impact | prior session |
| — | Music Mode mic/tab + transport bar + saved presets | prior session |
| — | Shader dropdown labels, menu opacity, tutorial | prior session |
| — | Initial GitHub repo + Netlify CLI live site | prior session |
| 5 | Spocks GPU budget — Lobby Safe preset, DPR/trail caps, tutorial | 2026-06-08 |
| 6 | Kaleidoscope polish — Jade Carousel, Ember Fold, Crystal Swap | 2026-06-08 |

---

*Last updated: 2026-06-08 (Flow Field white blowout fix)*
