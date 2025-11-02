# Technical Task Checklist

Each task has a checkbox (`[ ]`) and **Refs** linking to the plan item(s) in `docs/plan.md` (P#) and requirement(s) in `docs/requirements.md` (R#).  
**Phases** organize the flow: Setup → Data → Core Features → Customization/Interaction → Persistence → Performance → A11y/UX → Testing → Docs/Release.

> Mark completed tasks with `[x]` and keep references intact.

---

## Phase 0 — Project Setup

1. [x] Initialize repo with Next.js + TypeScript + pnpm; add ESLint/Prettier configs; configure **TypeScript strict** (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `useUnknownInCatchVariables`). **Refs:** P1, **P86**; R43, R46, **R48**  
2. [x] Add CI workflow (lint, type-check, unit tests) **and Playwright smoke E2E gating** via `pnpm check` (runs lint → tsc → unit → smoke). Smoke must **fail on `pageerror` and `console.error`**. **Refs:** P1, P82, **P85**; R43, R46, **R47**  
3. [x] Create app shell (sidebar, canvas, inspector) and route structure; add root `<div data-testid="app-shell">`; wrap shell in **AppErrorBoundary** and mount **GlobalErrorHooks** (window `error`/`unhandledrejection`). **Refs:** P2, **P85**; R43, **R47**  
4. [x] Integrate global state (Zustand) with action types and undo/redo stacks. **Refs:** P3, P34; R28, R43  
5. [x] Install UI kit (MUI or Radix) and base theme tokens (light/dark). **Refs:** P4; R23, R38, R43  

---

## Phase 1 — Data I/O & Schema

6. [x] Implement worker pool and message protocol (progress, error); use a **`createWorker` wrapper** that forwards `error` and `messageerror` to `console.error`. **Refs:** P6, P50, **P87**; R34, **R49**  
7. [x] CSV/TSV import via DuckDB-WASM (fallback PapaParse) with 1,000-row preview. **Refs:** P10; R1, R34  
8. [x] Excel/Parquet/Arrow import via DuckDB-WASM and Arrow adapters. **Refs:** P10; R1, R34  
9. [x] Schema/type inference and editable type controls in grid. **Refs:** P10, P12; R2  
10. [x] URL import with CORS handling + progress UI. **Refs:** P11; R3, R35  
11. [x] Clipboard paste parser with header detection. **Refs:** P11; R3  
12. [x] Field metadata editor (rename, labels, units) with propagation to views. **Refs:** P12; R4  
13. [ ] Visual filter chips (range, equals, contains, date bounds) with performance budget. **Refs:** P13; R5  
14. [ ] Expression editor (syntax check, preview, error counts). **Refs:** P14; R6  
15. [ ] Group-by/aggregate UI (sum, mean, median, count, min, max, std). **Refs:** P15; R7  
16. [ ] Pivot/unpivot helpers with before/after preview and revert. **Refs:** P15; R7  
17. [ ] Numeric/time binning controls (bins, width, edge rules). **Refs:** P16; R8  
18. [ ] Sampling (random, stratified) with labels in UI. **Refs:** P17; R9, R33  

---

## Phase 2 — Visualization Core (Scatter/Line/Bar)

19. [x] Integrate `vega-embed` wrapper component with spec versioning. **Refs:** P20; R45, R43  
20. [ ] Build drag-and-drop shelves for X, Y, Color, Size, Shape, Opacity, Row, Column. **Refs:** P21; R17  
21. [ ] Implement type guards and drop validation with user feedback. **Refs:** P21; R17, R18  
22. [ ] Scatter (base): render marks, handle nulls, axes. **Refs:** P22; R10  
23. [ ] Scatter customization: color/size/shape mappings + legends. **Refs:** P22, P25; R11, R19  
24. [ ] Scatter jitter control with reproducible seed. **Refs:** P22; R11  
25. [ ] Scatter trendlines (linear, polynomial, LOESS) via Vega transforms + equation/R² annotation. **Refs:** P22, P27; R11, R21  
26. [ ] Scatter error bars from fields or computed stats. **Refs:** P22; R11, R16  
27. [ ] Scatter faceting and layering by category. **Refs:** P22, P26; R12, R20  
28. [ ] Line (base): series grouping, X sorting, gap/interpolate options. **Refs:** P23; R13, R14  
29. [ ] Line markers + interpolation modes (linear/step/monotone). **Refs:** P23; R14  
30. [ ] Line smoothing overlays (moving average/LOESS). **Refs:** P23, P27; R14, R21  
31. [ ] Bar (base): aggregation, axis/labels. **Refs:** P24; R15  
32. [ ] Bar modes: grouped/stacked/100% + orientation flip. **Refs:** P24; R15  
33. [ ] Bar sorting (value/label/custom) + error bars. **Refs:** P24; R16  

---

## Phase 3 — Customization & Layout

34. [ ] Scale controls (linear/log/sqrt/power/time) with domain validation. **Refs:** P21; R18  
35. [ ] Tick count/format settings (SI, scientific). **Refs:** P21; R18  
36. [ ] Legend placement and series toggle (visibility synced to spec/URL). **Refs:** P25; R19  
37. [ ] Palette selector with default color-blind–safe options + custom palette editor. **Refs:** P25; R19, R38  
38. [ ] Facet controls for shared/independent scales. **Refs:** P26; R20  
39. [ ] Reference lines/bands (constant/computed) reacting to filters. **Refs:** P27; R21  
40. [ ] Annotations (text boxes) with drag/resize and delete. **Refs:** P27; R22  
41. [ ] Data labeler with overlap avoidance. **Refs:** P27; R22  
42. [ ] Theme manager (fonts, gridlines, padding) + save/apply themes. **Refs:** P28; R23  

---

## Phase 4 — Interaction

43. [ ] Zoom/pan with reset control; preserve selections. **Refs:** P30; R24  
44. [ ] Brush tool (rectangular) and lasso selection; selection state store. **Refs:** P31; R25  
45. [ ] Linked views: filter or highlight mode toggle. **Refs:** P31; R25  
46. [ ] Tooltips: selectable fields, formatters, pin/unpin. **Refs:** P32; R26  
47. [ ] Drilldown: click-to-filter creates filter chip with undo. **Refs:** P33; R27  
48. [ ] Undo/redo across mapping, filters, and transforms. **Refs:** P34; R28  

---

## Phase 5 — Persistence & Export

49. [ ] Define Project JSON schema (data pointer, transforms, specs, theme, templates). **Refs:** P40; R29  
50. [ ] Implement save/load; autosave to local storage; recovery prompt. **Refs:** P40; R29  
51. [ ] Export PNG/SVG with size/DPR controls and font embedding. **Refs:** P41; R30  
52. [ ] Export standalone HTML (embed data/spec or link). **Refs:** P41; R30  
53. [ ] Chart and style templates: save/apply with field remapping UI. **Refs:** P42; R31  
54. [ ] Version history and share link (if backend enabled). **Refs:** P43; R32, R42  

---

## Phase 6 — Performance & Reliability

55. [ ] Move parsing/transform heavy ops to workers; add progress bars. **Refs:** P50; R34  
56. [ ] Table virtualization tuning for large datasets. **Refs:** P50; R34  
57. [ ] Large data strategy: thresholds + automatic bin/density switch for scatter. **Refs:** P51; R33, R45  
58. [ ] Optional accelerated scatter mode (preserve encodings, fallback messaging). **Refs:** P51; R33, R45  
59. [ ] Performance monitoring (FPS/timing warnings) and docs of thresholds. **Refs:** P52; R33, R36  
60. [ ] Centralized error boundary and notification system. **Refs:** P53; R35  
61. [ ] Diagnostics toggle and anonymized event logs export. **Refs:** P54; R36  

---

## Phase 7 — Accessibility & UX

62. [ ] Keyboard shortcut map + command palette; shortcut cheat sheet. **Refs:** P60; R37  
63. [ ] A11y pass: ARIA roles/labels, focus order, trap management. **Refs:** P61; R38  
64. [ ] Palette contrast checks and color-blind presets. **Refs:** P61; R38  
65. [ ] Internationalization framework; locale switcher; number/date formats. **Refs:** P62; R39  
66. [ ] Onboarding tour and sample datasets/templates. **Refs:** P63; R40  

---

## Phase 8 — Testing & QA

67. [x] Unit tests for stores, reducers, and utilities; **Vitest setup throws on `console.error`/`console.warn` and fails on unhandled rejections**. **Refs:** P80, **P86**; R46, **R48**  
68. [ ] Component tests for shelves, inspector, grid. **Refs:** P80; R46  
69. [ ] E2E: import → scatter → facet → export happy path. **Refs:** P81; R46, R1, R10, R12, R30  
70. [ ] E2E: filters, brush/lasso, drilldown, undo/redo. **Refs:** P81; R5, R25, R27, R28  
71. [ ] E2E: large dataset thresholds and degrade path. **Refs:** P81, P51; R33  
72. [ ] Visual regression snapshots for key chart states. **Refs:** P83; R46  
73. [x] CI: `pnpm check` gates PRs (lint, type, unit, **smoke**). **Refs:** P82, **P85**; R43, R46, **R47**  

---

## Phase 9 — Documentation & Release

74. [ ] User guide covering scatter/line/bar workflows and customization. **Refs:** P41, P63; R10–R16, R23–R27  
75. [ ] Developer docs for spec mapping and data pipeline. **Refs:** P20, P50; R45  
76. [ ] Privacy/security notes (client-side by default). **Refs:** P70; R41  
77. [ ] Release packaging (Docker/static export), environment config. **Refs:** P84; R43  

---

## Phase 10 — Post-MVP (Optional)

78. [ ] Backend for version history and share links with Auth/RBAC. **Refs:** P43, P71; R32, R42  
79. [ ] Enhanced diagnostics dashboard for support. **Refs:** P54; R36  
