# Implementation Plan

This plan covers how to satisfy every requirement from `docs/requirements.md`. Each plan item lists its **ID (P#)**, description, **linked requirements (R#)**, **priority**, **deliverables**, and **dependencies**. Items are grouped logically.

---

## 1) Foundation & Architecture

**P1. Repo & Tooling Setup**  
- **Reqs:** R43, R46  
- **Priority:** High  
- **Deliverables:** Next.js + React + TypeScript scaffold; ESLint/Prettier; pnpm; CI workflow running lint/type/test.  
- **Dependencies:** —

**P2. App Shell & Routing**  
- **Reqs:** R43  
- **Priority:** High  
- **Deliverables:** Layout shell (sidebar for fields, central canvas, right inspector), router for /project/:id, URL state sync, **root `<div data-testid="app-shell">`**.  
- **Dependencies:** P1

**P3. Global State & Undo/Redo**  
- **Reqs:** R28, R43  
- **Priority:** High  
- **Deliverables:** Zustand (or equivalent) store, action log, undo/redo stacks, time-travel devtools.  
- **Dependencies:** P2

**P4. UI Kit, Theming & A11y Baseline**  
- **Reqs:** R23, R38, R43  
- **Priority:** High  
- **Deliverables:** MUI or Radix UI + CSS tokens; dark/light themes; focus-visible styles; WCAG AA base.  
- **Dependencies:** P2

**P5. Data Grid**  
- **Reqs:** R1–R2, R44  
- **Priority:** High  
- **Deliverables:** AG Grid with virtual rows, type icons, quick filters.  
- **Dependencies:** P2

**P6. Worker Infrastructure**  
- **Reqs:** R34  
- **Priority:** High  
- **Deliverables:** Web Worker pool with message protocol, progress events, **error channel surfaced to console**, error handling.  
- **Dependencies:** P1, P3

---

## 2) Data Layer

**P10. File Import (CSV/TSV/Excel/Parquet/Arrow)**  
- **Reqs:** R1, R2, R34, R35  
- **Priority:** High  
- **Deliverables:** Parsers via DuckDB‑WASM/Arrow; preview (1,000 rows); schema editor; error reporting.  
- **Dependencies:** P5, P6

**P11. URL & Clipboard Import**  
- **Reqs:** R3, R35  
- **Priority:** Medium  
- **Deliverables:** URL fetch with CORS handling and progress; clipboard tabular paste.  
- **Dependencies:** P10

**P12. Metadata Editing (Rename/Labels/Units)**  
- **Reqs:** R4  
- **Priority:** Medium  
- **Deliverables:** Field properties panel; propagation to axes/tooltips/legends.  
- **Dependencies:** P10

**P13. Filter & Query Builder**  
- **Reqs:** R5  
- **Priority:** High  
- **Deliverables:** Visual filter chips; range/date pickers; performance budget handling.  
- **Dependencies:** P3, P10

**P14. Derived Columns (Expressions)**  
- **Reqs:** R6  
- **Priority:** Medium  
- **Deliverables:** Expression editor with validation; worker evaluation; preview.  
- **Dependencies:** P6, P10

**P15. Aggregate/Group & Pivot/Unpivot**  
- **Reqs:** R7  
- **Priority:** High  
- **Deliverables:** Group-by/aggregate UI; pivot/unpivot helpers; revert pipeline steps.  
- **Dependencies:** P10, P13

**P16. Binning & Categorization**  
- **Reqs:** R8  
- **Priority:** Medium  
- **Deliverables:** Numeric/time bin UI; edges rules; labels.  
- **Dependencies:** P10

**P17. Sampling**  
- **Reqs:** R9, R33  
- **Priority:** Medium  
- **Deliverables:** Random/stratified sampling; clear labeling of sampled views.  
- **Dependencies:** P13

---

## 3) Visualization Core

**P20. Vega-Lite Harness**  
- **Reqs:** R45, R43  
- **Priority:** High  
- **Deliverables:** React wrapper using `vega-embed`; spec versioning; common options (renderer, actions disabled, download hook).  
- **Dependencies:** P2

**P21. Drag-and-Drop Mapping Shelves**  
- **Reqs:** R17, R18, R19, R20  
- **Priority:** High  
- **Deliverables:** Shelves for X/Y/Color/Size/Shape/Opacity/Row/Column; type guards and drop validation.  
- **Dependencies:** P3, P20

**P22. Scatter Plot (MVP)**  
- **Reqs:** R10–R12, R18–R21  
- **Priority:** High  
- **Deliverables:** Scatter mark, legends, jitter, trendlines (Vega transforms), error bars, facets/layers.  
- **Dependencies:** P21

**P23. Line Chart (MVP)**  
- **Reqs:** R13–R14, R18–R21  
- **Priority:** High  
- **Deliverables:** Lines with series, interpolation, markers, smoothing overlays.  
- **Dependencies:** P21

**P24. Bar Chart (MVP)**  
- **Reqs:** R15–R16, R18–R21  
- **Priority:** High  
- **Deliverables:** Grouped/stacked/100% bars, orientation flip, sorting, error bars.  
- **Dependencies:** P21

**P25. Legends & Palettes**  
- **Reqs:** R19, R38  
- **Priority:** High  
- **Deliverables:** Placeable legends; toggle visibility; default color-blind–safe palettes; custom palette editor.  
- **Dependencies:** P22–P24

**P26. Faceting Controls**  
- **Reqs:** R12, R20  
- **Priority:** Medium  
- **Deliverables:** Shared vs independent scales; grid layout options.  
- **Dependencies:** P21–P24

**P27. Reference Lines, Bands & Annotations**  
- **Reqs:** R21–R22  
- **Priority:** Medium  
- **Deliverables:** Constant/computed lines/bands; text annotations; data labels with overlap rules.  
- **Dependencies:** P22–P24

**P28. Themes & Styling**  
- **Reqs:** R23  
- **Priority:** Low  
- **Deliverables:** Theme manager (fonts, gridlines, padding); save/apply custom themes.  
- **Dependencies:** P25–P27

---

## 4) Interaction

**P30. Zoom/Pan & Reset**  
- **Reqs:** R24  
- **Priority:** High  
- **Deliverables:** Wheel zoom, drag pan, reset button; preserve selection.  
- **Dependencies:** P22–P24

**P31. Brush/Lasso & Crossfilter**  
- **Reqs:** R25  
- **Priority:** High  
- **Deliverables:** Brush and lasso tools; selection state; linked-view filtering/highlighting.  
- **Dependencies:** P30

**P32. Tooltips**  
- **Reqs:** R26  
- **Priority:** High  
- **Deliverables:** Configurable tooltip fields/formatters; pin/unpin; inspector integration.  
- **Dependencies:** P22–P24

**P33. Drilldown**  
- **Reqs:** R27  
- **Priority:** Medium  
- **Deliverables:** Click-to-filter; filter chip creation; undo affordance.  
- **Dependencies:** P31, P13

**P34. Undo/Redo**  
- **Reqs:** R28  
- **Priority:** High  
- **Deliverables:** Action-based undo/redo integrated across mapping, filters, transforms.  
- **Dependencies:** P3

---

## 5) Persistence & Export

**P40. Project Save/Load & Autosave**  
- **Reqs:** R29  
- **Priority:** High  
- **Deliverables:** Project JSON schema; local storage autosave; import/export project.  
- **Dependencies:** P3, P22–P24

**P41. Export PNG/SVG/HTML**  
- **Reqs:** R30  
- **Priority:** High  
- **Deliverables:** Image export with DPR/size controls; standalone HTML exporter.  
- **Dependencies:** P20, P22–P24

**P42. Templates (Chart & Style)**  
- **Reqs:** R31  
- **Priority:** Medium  
- **Deliverables:** Save/apply chart templates; field remapping prompts.  
- **Dependencies:** P25, P28, P40

**P43. Version History & Share Link (Optional)**  
- **Reqs:** R32, R42  
- **Priority:** Low  
- **Deliverables:** Backend (if chosen) for versions; auth; share-by-link with permissions.  
- **Dependencies:** P40

---

## 6) Performance & Reliability

**P50. Worker/Streaming/Virtualization Enhancements**  
- **Reqs:** R34  
- **Priority:** High  
- **Deliverables:** Long-running ops moved to workers; chunked parsing; grid virtualization tuning.  
- **Dependencies:** P6, P10, P13

**P51. Large-Data Strategy**  
- **Reqs:** R33, R45  
- **Priority:** Medium  
- **Deliverables:** Threshold-based strategy: bin/density, aggregation, and optional accelerated scatter mode while preserving encodings.  
- **Dependencies:** P22

**P52. Performance Monitoring & Budgets**  
- **Reqs:** R33, R36  
- **Priority:** Medium  
- **Deliverables:** FPS meter (dev), timings, warnings; docs on thresholds.  
- **Dependencies:** P51

**P53. Error Handling & Notifications**  
- **Reqs:** R35  
- **Priority:** High  
- **Deliverables:** Centralized error boundary; toast/inline messages; retry actions.  
- **Dependencies:** P1–P3

**P54. Diagnostics Toggle**  
- **Reqs:** R36  
- **Priority:** Low  
- **Deliverables:** Opt-in telemetry with anonymization; export diagnostics bundle.  
- **Dependencies:** P53

---

## 7) Accessibility & UX

**P60. Keyboard Shortcuts**  
- **Reqs:** R37  
- **Priority:** Medium  
- **Deliverables:** Shortcut map; command palette; on-screen cheat sheet.  
- **Dependencies:** P2, P22–P24

**P61. Accessibility (WCAG 2.2 AA)**  
- **Reqs:** R38  
- **Priority:** High  
- **Deliverables:** ARIA roles/labels; focus order; color contrast checks; screen-reader labels for charts.  
- **Dependencies:** P4, P25

**P62. Internationalization**  
- **Reqs:** R39  
- **Priority:** Low  
- **Deliverables:** i18n framework; locale switcher; number/date formats.  
- **Dependencies:** P2

**P63. Onboarding & Samples**  
- **Reqs:** R40  
- **Priority:** Medium  
- **Deliverables:** Guided tour; 2–3 sample datasets; starter templates.  
- **Dependencies:** P22–P24, P42

---

## 8) Security & Privacy

**P70. Client-Side Data Boundary**  
- **Reqs:** R41  
- **Priority:** High  
- **Deliverables:** Clear boundary (no upload without opt-in); TLS; CSP; privacy notes.  
- **Dependencies:** P1

**P71. Auth & RBAC (Optional Backend)**  
- **Reqs:** R42  
- **Priority:** Low  
- **Deliverables:** AuthN/AuthZ for shared projects; role enforcement; audit log.  
- **Dependencies:** P43

---

## 9) Testing & CI/CD

**P80. Unit/Integration Test Suite**  
- **Reqs:** R46 (and functional coverage of many)  
- **Priority:** High  
- **Deliverables:** Vitest/Jest + RTL for stores/components/utils.  
- **Dependencies:** P1–P4

**P81. E2E Tests**  
- **Reqs:** R46  
- **Priority:** High  
- **Deliverables:** Playwright scripts for core flows: import → scatter → facet → export.  
- **Dependencies:** P22–P24, P41

**P82. Lint/Type/Format Gates & CI**  
- **Reqs:** R43, R46, **R47**  
- **Priority:** High  
- **Deliverables:** CI with lint, type, unit, **smoke E2E gating via `pnpm check`**; merge gates.  
- **Dependencies:** P1

**P83. Visual Regression (Optional)**  
- **Reqs:** R46  
- **Priority:** Low  
- **Deliverables:** Screenshot diffs for key charts (Playwright).  
- **Dependencies:** P81

**P84. Release Packaging**  
- **Reqs:** R43  
- **Priority:** Medium  
- **Deliverables:** Docker/Static export; environment config; versioning.  
- **Dependencies:** P82

---

## 10) Runtime Guard Rails & Error Surfacing

**P85. Runtime Smoke & Error Guard Rails**  
- **Reqs:** R47, R46, R35  
- **Priority:** High  
- **Deliverables:** Playwright **smoke** spec that navigates to `/` and fails on `pageerror`/`console.error`; global error hooks for `window.error` and `unhandledrejection`; **AppErrorBoundary** wrapping the shell; root `data-testid="app-shell"`.  
- **Dependencies:** P1, P2

**P86. Strict TS & Unit Console Traps**  
- **Reqs:** R48, R46  
- **Priority:** High  
- **Deliverables:** `tsconfig` strict settings; Vitest config + setup that throws on `console.error`/`console.warn` and fails on unhandled rejections; `pnpm check` aggregator (lint + tsc + unit + smoke).  
- **Dependencies:** P1

**P87. Worker Error Propagation Wrapper**  
- **Reqs:** R49, R34  
- **Priority:** High  
- **Deliverables:** `createWorker` helper that attaches `error`/`messageerror` listeners forwarding to `console.error`; usage across all workers.  
- **Dependencies:** P6

---

## Coverage Check

- **All requirements R1–R49** are covered by plan items.  
- **MVP focus:** P1–P6, P10, P13, P15, P20–P26, P22–P24, P30–P32, P34, P40–P41, P50, P53, P61, P80–P82, **P85–P86**.

