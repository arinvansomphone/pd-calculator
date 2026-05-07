# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static, single-page web app that simulates a peritoneal dialysis (PD) weekly cycle and reports `stdKt/V`, APC, TAC, and `Kurea`. Authored by Arin Vansomphone for Dr. Tim Meyer's group at Stanford. No build system, no tests, no package manager — vanilla HTML/CSS/JS with Chart.js loaded from a CDN. Deployed to GitHub Pages via Jekyll on push to `master` (see `.github/workflows/jekyll-gh-pages.yml`).

## Run / iterate

Open [index.html](index.html) directly in a browser, or serve the directory (`python3 -m http.server`). No tooling, no install step. There are no tests.

## Active vs. legacy files

Only these scripts are loaded by [index.html](index.html):

- [controller.js](controller.js) — input gathering, the simulation, the results table, run/reset.
- [graph.js](graph.js) — Chart.js setup and the plotting helper.

[script.js](script.js) is **legacy and unreferenced**. It contains an older `pdCalculator` with a different signature, different unit system, different DOM IDs (`exVolume 1`, `pdCalculatorForm`, `m_fluid_removal`, etc.) that no longer exist in `index.html`. Do not edit it expecting changes to take effect, and do not copy patterns from it without checking against `controller.js` first.

## Architecture

[index.html](index.html) is the only page wired to the simulator (`about.html` is plain content). The page has four boxes: Patient Data (top-left), Graph (top-right), Prescription Data (bottom-left), Numeric Results (bottom-right).

Flow on "Add Treatment" click:

1. `gatherPrescriptionInputs(2)` reads patient + prescription fields. Repeated/Additional rows are expanded into per-exchange `volumeData`/`timeData`/`ufData` arrays — `timeData` stores **hours per single exchange** (total time ÷ number).
2. `pdCalculator(...)` runs a minute-by-minute simulation over `7 × 24 × 60 = 10080` minutes. Outer loop iterates the whole week until end-of-week plasma concentration converges (tolerance 0.1 mg/L, max 10000 iterations) — that's the "weekly steady state."
3. Each treatment-day exchange has three phases: start-of-exchange (fresh fill, dead-volume carry-forward via `prevDialysateConc_mgL`), active dwell (mass transfer via diffusion + convection), and dead time (drain/fill, no transfer). Non-treatment minutes apply renal excretion + urea generation only.
4. Result is pushed to `treatmentHistory` (max 4, newest first). `updateGraphWithTreatment` redraws the chart with all 4. `updateAllResults` populates the four result columns (`tx1`–`tx4`).

The chart in [graph.js](graph.js) pre-creates 8 datasets (4 treatments × {solid line, dashed average}) and the custom legend toggles `meta.hidden` on those slots — keep this 8-dataset structure intact when changing the graph.

## Units (read this before touching the math)

The simulation's internal unit system is documented at [controller.js:140](controller.js:140). It is easy to break:

- Concentrations inside `pdCalculator` are **mg/L of plasma water** (urea distributes only into body water, and Watson's V is total body water — so the mass-balance equations naturally track plasma-water concentration). The UI reports **mg/dL of whole plasma**, the lab/clinical convention: the boundary multiplies by `0.93 / 10` (`updateAllResults`, `updateGraphWithTreatment`). Whole-plasma concentration is *lower* than plasma-water because urea is excluded from the protein/lipid fraction (~7%).
- **stdKt/V** ([controller.js:380](controller.js:380), duplicated at [:398](controller.js:398)) uses **whole-plasma TAC** over **body-water volume** — the canonical PD form `K_wp · t / V_urea`. Since internal `tac` is mg/L plasma water, the formula divides by `(tac * 0.93)`. Don't "simplify" by dropping the 0.93 — the result is ~7.5% off the canonical clinical target without it.
- **Excel upslope test (#2):** with the whole-plasma display, recover `gen` from the observed plasma slope as `gen = slope × V_water / 0.93 / 100` (slope in mg/dL/min, V_water in mL). Without the `÷ 0.93`, the back-calc gives `0.93 × gen`.
- `kru` and `mtac` are **mL/min**. The `kru` input is treated as **whole plasma** clearance and converted to **plasma water** inside `pdCalculator` via `kru = kru * 0.93` ([controller.js:143](controller.js:143)) — plasma-water clearance is *smaller* than whole-plasma because urea is concentrated in the water fraction, so `K_pw = 0.93 × K_wp`. This is a local parameter reassignment, so the "Kurea" cell in the results table still displays the original whole-plasma input.
- `volume` (Vd) input is **L**, converted to `V_mL` once. Per-exchange fill `volumeData` is **L** input → **mL** in `fillVolume`. `ufData` is **mL total** for the row, divided by `effectiveTime_min` to get the per-minute UF rate.
- `gen` (urea-N generation, mg/min) comes from `computeGeneration(pna, weight)` using the Borah formula: `(nPNA × weight − 19) / 7.62 × 1000 / 1440`, clamped at zero. nPNA is g/kg/day.
- Vd auto-fill in `calculateVolume()` uses the Watson formulas (sex-specific) — different from the formula in legacy `script.js`.

If you change a unit, audit every place the variable flows and trace through to the four output cells. Recent commit history (`1bf9075`, `ff71611`, `7b4cc45`, `01919b5`) is almost entirely unit-conversion fixes — be deliberate.

## State conventions

- `treatments.treatment2` holds only the most recent run (kept for back-compat with the older graph code shape).
- `treatmentHistory` is the source of truth for the table and graph: index 0 is newest, length capped at 4.
- `resetAll()` clears history, table, prescription inputs, and re-checks all day boxes — but **preserves patient data**. Match this scope if extending reset.
- "Add Treatment" button is gated by `validatePrescription(2)` via `updateButtonStates()` on every relevant input change; keep new inputs wired into that listener set.
