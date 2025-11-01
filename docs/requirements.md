# Requirements Document

## Introduction

The client needs an **interactive web application**—inspired by the JMP Graph Builder—aimed at **engineers** who must rapidly explore, compare, and communicate insights from tabular data. The application will emphasize **drag‑and‑drop construction** of **scatter plots, line charts, and bar charts**, with rich customization (mappings, scales, styling), smooth interaction (zoom, pan, brush/lasso, tooltips), and robust data handling (CSV/TSV/Excel/Parquet/Arrow, URL and clipboard import, transform pipelines, and export).

To ensure **interactivity and customizability**, the visualization stack will center on **Vega‑Lite (via `vega-embed`) and Vega** for a grammar‑of‑graphics–style authoring model. Data prep will use **DuckDB‑WASM** and **Apache Arrow** in the browser, with a **React + TypeScript** UI. For very large point clouds, we will degrade gracefully via binning/aggregation/density and (optionally) swap to a WebGL‑backed scatter implementation as needed. The scope prioritizes **scatter, line, and bar** while keeping the architecture extensible.

---

## Requirements

> Format: Each requirement lists a **User Story** and **Acceptance Criteria**. Criteria are **specific, testable**, and include normal flows, edge cases, error handling, persistence, and UI/UX considerations where relevant. Numbering is sequential and grouped by theme.

### A. Data Ingestion & Preparation (R1–R9)

**R1. File Import (CSV/TSV/Excel/Parquet/Arrow)**  
**User Story:** As a user, I want to import common tabular files so that I can start plotting immediately.  
**Acceptance Criteria:**  
- WHEN I drag-and-drop or choose a file (CSV/TSV/Excel/Parquet/Arrow) THEN the system SHALL parse a **1,000-row preview**, infer types, and show a schema/preview grid with edit controls.  
- WHEN the file contains malformed rows THEN the system SHALL show a **non-blocking error list** with row numbers and an option to skip or fix and re-parse.  
- WHEN a file exceeds the in-memory threshold (configurable) THEN the system SHALL prompt to **sample, chunk, or stream** (if supported), without freezing the UI.  
- WHEN Excel contains multiple sheets THEN the system SHALL let me select a sheet before import.  

**R2. Type Inference & Casting**  
**User Story:** As a user, I want accurate data types with override capability so that fields behave correctly in charts.  
**Acceptance Criteria:**  
- WHEN a dataset loads THEN the system SHALL infer **numeric, categorical, datetime, string, boolean** types and display them.  
- WHEN I change a field’s type THEN the system SHALL **re-parse or cast** and update dependent charts; on cast failure it SHALL show a message and keep the prior valid state.  
- WHEN datetime fields have mixed formats/time zones THEN the system SHALL provide parsing options and preview of the parsed result.  

**R3. URL & Clipboard Import**  
**User Story:** As a user, I want to import from a URL or paste data so that I can work from shared datasets quickly.  
**Acceptance Criteria:**  
- WHEN I provide a **URL** THEN the system SHALL attempt fetch with progress UI and CORS handling; on failure it SHALL show a retriable error.  
- WHEN I **paste** a table from the clipboard THEN the system SHALL parse delimited content into a new dataset with header detection.  

**R4. Field Metadata (Rename, Labels, Units)**  
**User Story:** As a user, I want to rename fields and set labels/units so that charts communicate clearly.  
**Acceptance Criteria:**  
- WHEN I edit a field name/label/unit THEN the system SHALL update all charts and legends using that field.  
- WHEN a label/unit is defined THEN the system SHALL allow **axis titles** and **tooltips** to reflect them.  

**R5. Filters & Query Builder**  
**User Story:** As a user, I want to filter rows so that charts show only relevant data.  
**Acceptance Criteria:**  
- WHEN I add a filter (range, equals, contains, in-list, date bounds) THEN the system SHALL update charts **in <300ms** for medium datasets (e.g., ≤100k rows) or show progress.  
- WHEN a filter would remove all rows THEN the system SHALL show “No data after filter” and provide a one-click reset.  

**R6. Derived Columns (Expressions)**  
**User Story:** As a user, I want to create computed fields so that I can plot transformations without modifying the source file.  
**Acceptance Criteria:**  
- WHEN I define an expression (e.g., `force = mass * accel`) THEN the system SHALL validate syntax, preview values, and add the new field to the schema.  
- WHEN an expression errors on some rows THEN the system SHALL compute nulls for those rows and show a warning with counts.  

**R7. Aggregate, Group, Pivot/Unpivot**  
**User Story:** As a user, I want to aggregate and reshape data so that line/bar summaries are easy.  
**Acceptance Criteria:**  
- WHEN I group by one or more fields with aggregations (sum, mean, median, count, min, max, std) THEN the system SHALL materialize a derived view for plotting.  
- WHEN I pivot/unpivot THEN the system SHALL show before/after previews and provide a **revert** option.  

**R8. Binning & Categorization**  
**User Story:** As a user, I want to bin numeric/time fields so that histograms and binned bars are straightforward.  
**Acceptance Criteria:**  
- WHEN I enable **binning** on a field THEN the system SHALL create bins with adjustable count/width and show inclusive/exclusive edge rules.  
- WHEN I bin datetimes THEN the system SHALL support **year/quarter/month/week/day/hour** intervals.  

**R9. Sampling**  
**User Story:** As a user, I want to downsample large datasets so that interaction remains responsive.  
**Acceptance Criteria:**  
- WHEN I choose sampling (random, stratified by category) THEN the system SHALL display the sample size and original size and clearly label sampled views.  

---

### B. Core Charts (Scatter, Line, Bar) (R10–R16)

**R10. Scatter Plot (Base)**  
**User Story:** As a user, I want to create a scatter plot by mapping fields to X and Y so that I can see relationships.  
**Acceptance Criteria:**  
- WHEN I drop numeric/datetime fields onto **X** and **Y** THEN the system SHALL render a scatter plot with default point style and axes.  
- WHEN fields contain nulls THEN the system SHALL **skip null points** and show a count of skipped rows.  

**R11. Scatter Customization**  
**User Story:** As a user, I want to customize size, color, shape, jitter, opacity, and add trendlines/error bars so that the scatter conveys signal.  
**Acceptance Criteria:**  
- WHEN I map a field to **color/size/shape** THEN the system SHALL update marks and legends accordingly; continuous color SHALL show a ramp and discrete a palette.  
- WHEN I enable **jitter** THEN the system SHALL apply reproducible jitter with adjustable magnitude.  
- WHEN I add **trendlines** (linear, polynomial, LOESS) THEN the system SHALL draw them and list equation/R² in a legend or annotation.  
- WHEN I add **error bars** (±, CI) THEN the system SHALL render them from specified fields or computed stats.  

**R12. Scatter Grouping & Faceting**  
**User Story:** As a user, I want to facet or layer by a categorical field so that I can compare groups.  
**Acceptance Criteria:**  
- WHEN I drop a category onto **Row/Column facets** THEN the system SHALL create a grid of small multiples with shared or independent scales per my choice.  
- WHEN I layer by a category THEN the system SHALL create separate series in a single view and add a legend.  

**R13. Line Chart (Base)**  
**User Story:** As a user, I want to map a time or ordered numeric field to X and a measure to Y so that I can visualize trends.  
**Acceptance Criteria:**  
- WHEN I plot a line THEN the system SHALL connect points **by group** (if a series field is mapped) and respect sort order on X.  
- WHEN X has gaps THEN the system SHALL offer **gapped** or **interpolated** rendering.  

**R14. Line Options (Markers, Interpolation, Smoothing)**  
**User Story:** As a user, I want markers, interpolation choice, and smoothing so that the line communicates reliably.  
**Acceptance Criteria:**  
- WHEN I toggle **markers** THEN the system SHALL render circles at each data point.  
- WHEN I select **interpolation** (linear, step, monotone) THEN the system SHALL update the path.  
- WHEN I enable **moving average/LOESS** THEN the system SHALL display a smoothed overlay with configurable window/alpha.  

**R15. Bar Chart (Base, Grouped/Stacked/100%)**  
**User Story:** As a user, I want flexible bars so that I can compare magnitudes by category.  
**Acceptance Criteria:**  
- WHEN I map a category to X and a measure to Y THEN the system SHALL aggregate by default (sum) and draw bars with axis/labels.  
- WHEN I choose **grouped**, **stacked**, or **100% stacked** THEN the system SHALL recompute layouts and legends accordingly.  
- WHEN I flip orientation THEN the system SHALL switch between vertical and horizontal bars.  

**R16. Bar Sorting & Error Bars**  
**User Story:** As a user, I want to sort bars and show variability so that the best/worst stand out.  
**Acceptance Criteria:**  
- WHEN I choose sort (ascending/descending by value, by label, or custom) THEN the system SHALL reorder bars.  
- WHEN I add **error bars** for bars THEN the system SHALL render them from fields or computed stats.  

---

### C. Aesthetic Mapping & Layout (R17–R23)

**R17. Drag-and-Drop Shelves**  
**User Story:** As a user, I want to map fields to axes, color, size, shape, opacity, row/column facets so that I can build charts visually.  
**Acceptance Criteria:**  
- WHEN I drag a field onto a shelf THEN the system SHALL update the spec and re-render without page reload.  
- WHEN a field is incompatible (e.g., string to Y numeric) THEN the system SHALL refuse the drop and explain why.  

**R18. Scales & Axes**  
**User Story:** As a user, I want control over scale type, domain, tick formatting, and axis titles so that the chart reads correctly.  
**Acceptance Criteria:**  
- WHEN I choose a **scale** (linear, log, sqrt, power, time) THEN the system SHALL re-render and validate domain (e.g., no ≤0 on log).  
- WHEN I set **tick count/format** THEN the system SHALL apply it (e.g., scientific notation, SI units).  

**R19. Legends & Palettes**  
**User Story:** As a user, I want legends I can place, filter with, and style so that the design fits my report.  
**Acceptance Criteria:**  
- WHEN I reposition a legend (inside/outside, top/bottom/left/right) THEN the system SHALL update layout.  
- WHEN I click a legend item THEN the system SHALL **toggle series visibility** and reflect the state in the URL/spec.  
- WHEN I choose a color palette THEN the system SHALL apply **color-blind–friendly defaults** and allow custom palettes.  

**R20. Faceting Controls**  
**User Story:** As a user, I want to configure facet grid with shared/independent scales to compare groups fairly.  
**Acceptance Criteria:**  
- WHEN I enable **shared scales** THEN all panels SHALL use a common domain; otherwise domains are per-panel.  

**R21. Reference Lines & Bands**  
**User Story:** As a user, I want target lines and statistical bands so that thresholds are visible.  
**Acceptance Criteria:**  
- WHEN I add a **constant** or **computed** reference (mean/median/quantiles) THEN the system SHALL draw lines/bands and update them when filters change.  

**R22. Annotations & Data Labels**  
**User Story:** As a user, I want to annotate points/ranges so that important context is captured.  
**Acceptance Criteria:**  
- WHEN I add a **text annotation** THEN the system SHALL support drag-to-position, edit, and delete.  
- WHEN I enable **data labels** THEN the system SHALL label points/bars with selected fields with overlap avoidance.  

**R23. Themes & Styling**  
**User Story:** As a user, I want overall theme control so that outputs match brand or publication style.  
**Acceptance Criteria:**  
- WHEN I choose a theme (fonts, gridlines, padding) THEN the system SHALL apply it across current and newly created charts and allow saving custom themes.  

---

### D. Interaction & Exploration (R24–R28)

**R24. Zoom/Pan & Reset**  
**User Story:** As a user, I want to zoom and pan so that I can inspect details.  
**Acceptance Criteria:**  
- WHEN I wheel-zoom or drag-pan THEN the system SHALL update view without losing selection; a **Reset View** button SHALL restore defaults.  

**R25. Brush/Lasso & Crossfilter**  
**User Story:** As a user, I want to select points and have other charts respond so that patterns across views are clear.  
**Acceptance Criteria:**  
- WHEN I **brush/lasso** a region THEN the system SHALL highlight selected points and **filter or highlight** linked views (toggle).  
- WHEN I clear selection THEN all views SHALL return to the prior state.  

**R26. Tooltips**  
**User Story:** As a user, I want configurable tooltips so that the right fields and units appear on hover.  
**Acceptance Criteria:**  
- WHEN I hover THEN the system SHALL show a tooltip with chosen fields and formats; WHEN I pin a tooltip THEN it SHALL stay visible until dismissed.  

**R27. Drilldown (Click-to-Filter)**  
**User Story:** As a user, I want to click a bar/series/point to filter the dataset so that I can go deeper.  
**Acceptance Criteria:**  
- WHEN I click a mark THEN the system SHALL add a corresponding filter and visibly list it in the filter panel with an undo affordance.  

**R28. Undo/Redo**  
**User Story:** As a user, I want unlimited undo/redo (within session limits) so that experimentation is safe.  
**Acceptance Criteria:**  
- WHEN I press Ctrl/Cmd+Z or click Undo THEN the system SHALL step back one action (mapping changes, filters, encodings); Redo SHALL re-apply.  

---

### E. Persistence, Export & Collaboration (R29–R32)

**R29. Save/Load Project & Autosave**  
**User Story:** As a user, I want to save my session so that I can resume later.  
**Acceptance Criteria:**  
- WHEN I click **Save** THEN the system SHALL persist a **project JSON** (dataset pointer, transforms, viz specs, theme, templates).  
- WHEN I revisit or after a crash THEN the system SHALL offer to restore the latest **autosave**.  

**R30. Export PNG/SVG/HTML**  
**User Story:** As a user, I want to export charts so that I can share them outside the tool.  
**Acceptance Criteria:**  
- WHEN I export **PNG/SVG** THEN the system SHALL generate at specified resolution/size with correct fonts and colors.  
- WHEN I export **standalone HTML** THEN the system SHALL embed the spec and data (or a link) so it can open offline.  

**R31. Templates (Chart & Style)**  
**User Story:** As a user, I want to save reusable templates so that I can apply consistent settings.  
**Acceptance Criteria:**  
- WHEN I save a **chart template** THEN the system SHALL capture mappings, encodings, styles, and reapply them to new data with field remapping prompts as needed.  

**R32. Version History & Share Link (Optional Back End)**  
**User Story:** As a user, I want version history and shareable links so that collaboration is easy.  
**Acceptance Criteria:**  
- WHEN versioning is enabled THEN saves SHALL create a new immutable version with timestamp and user; a **share link** SHALL load that exact version (read-only by default).  

---

### F. Performance & Reliability (R33–R36)

**R33. Performance Budgets & Degrade Strategy**  
**User Story:** As a user, I want responsive charts even on large data so that the tool remains usable.  
**Acceptance Criteria:**  
- WHEN plotting **≤50k points** THEN pan/zoom SHALL remain responsive (target ≥30 FPS on a mid-range laptop).  
- WHEN exceeding thresholds THEN the system SHALL suggest **binning, aggregation, or density** and document any visual approximations.  

**R34. Workers, Streaming & Virtualization**  
**User Story:** As a user, I want heavy operations off the main thread so that the UI does not freeze.  
**Acceptance Criteria:**  
- WHEN parsing or transforming THEN the system SHALL use **Web Workers** with progress indicators.  
- WHEN viewing tables THEN the system SHALL use **virtualized grids** to keep memory stable.  

**R35. Error Handling**  
**User Story:** As a user, I want clear, actionable errors so that I can recover quickly.  
**Acceptance Criteria:**  
- WHEN an operation fails THEN the system SHALL show a contextual message with cause, impact, and next steps—never a blank screen.  

**R36. Diagnostics & Logging**  
**User Story:** As a user, I want optional diagnostics so that support can reproduce issues.  
**Acceptance Criteria:**  
- WHEN diagnostics are enabled THEN the system SHALL record anonymized events (feature flags, specs, performance timings) respecting privacy settings.  

---

### G. UX & Accessibility (R37–R40)

**R37. Keyboard Shortcuts**  
**User Story:** As a user, I want keyboard access to core actions so that I can work efficiently.  
**Acceptance Criteria:**  
- WHEN I use shortcuts (e.g., Undo/Redo, Save, Reset Zoom, move focus between shelves) THEN the system SHALL perform the action and show a toast.  

**R38. Accessibility (WCAG 2.2 AA)**  
**User Story:** As a user, I want accessible visuals so that everyone can use the tool.  
**Acceptance Criteria:**  
- WHEN navigating by keyboard THEN all controls and chart interactions SHALL be operable and focus-visible.  
- WHEN using a screen reader THEN axes, legends, and selections SHALL expose ARIA labels/descriptions.  
- WHEN using default palettes THEN color contrast SHALL meet **WCAG 2.2 AA** and color-blind–safe defaults SHALL be available.  

**R39. Internationalization & Locale**  
**User Story:** As a user, I want localized UI and formats so that numbers and dates match my locale.  
**Acceptance Criteria:**  
- WHEN I switch locale THEN UI strings and number/date formats (e.g., decimal separators) SHALL update without reloading data.  

**R40. Onboarding & Samples**  
**User Story:** As a user, I want quick onboarding so that I can be productive immediately.  
**Acceptance Criteria:**  
- WHEN I open the app first time THEN a short **guided tour** and **sample datasets** SHALL be available.  

---

### H. Security & Privacy (R41–R42)

**R41. Client-Side by Default & Privacy**  
**User Story:** As a user, I want my data to stay local unless I choose to share so that sensitive data is protected.  
**Acceptance Criteria:**  
- WHEN I do not sign in or opt-in to cloud features THEN the system SHALL keep data processing **client-side only**; uploads over TLS when used; nothing is logged server-side.  

**R42. Auth & RBAC for Sharing**  
**User Story:** As a user, I want controlled sharing so that sensitive work is protected.  
**Acceptance Criteria:**  
- WHEN I share a project to the cloud THEN the system SHALL require authentication and enforce **role-based access** (owner, editor, viewer).  

---

### I. Technical Constraints & Libraries (R43–R46)

**R43. Front-End Stack**  
**User Story:** As a developer, I want a modern scaffold so that the team ships reliably.  
**Acceptance Criteria:**  
- WHEN I run `pnpm install && pnpm dev` THEN a **Next.js + React + TypeScript** app SHALL start with linting/formatting preconfigured.  
- WHEN building THEN CI SHALL enforce ESLint/TypeScript checks.  

**R44. Data Layer Libraries**  
**User Story:** As a developer, I want robust in-browser data tooling so that transforms are fast and reliable.  
**Acceptance Criteria:**  
- WHEN parsing CSV/TSV/Excel/Parquet/Arrow THEN the system SHALL use **DuckDB‑WASM** and **Apache Arrow** where feasible (CSV/TSV may use PapaParse as a fast fallback).  
- WHEN showing tables THEN the system SHALL use **AG Grid (virtualized)** with column type hints and filter UI.  

**R45. Visualization Libraries (Interactive + Customizable)**  
**User Story:** As a developer, I want a grammar-of-graphics layer with strong interactivity so that features mirror JMP Graph Builder.  
**Acceptance Criteria:**  
- WHEN rendering charts THEN the system SHALL compile a spec to **Vega‑Lite (via `vega-embed`)** with **Vega** for advanced transforms (regression, LOESS, window).  
- WHEN point counts exceed thresholds THEN the system SHALL (configurable) **switch to density/binning** or an **accelerated scatter** implementation while preserving mappings and legends.  

**R46. Testing & QA Tooling**  
**User Story:** As a developer, I want automated tests so that regressions are caught early.  
**Acceptance Criteria:**  
- WHEN running tests in CI THEN **Vitest/Jest + React Testing Library** SHALL run unit/integration suites and **Playwright** SHALL run E2E across Chromium/WebKit/Firefox.
