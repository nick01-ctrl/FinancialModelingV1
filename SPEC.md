# FinModel AI — Product Specification
**Version 1.0 | Derived from Design Interview**

---

## Implementation Status

> Last updated: 2026-02-25

### Completed

| Feature | Status | Notes |
|---|---|---|
| **DCF Model — Full Engine** | Done | Pure-function `calculateDCF()` with WACC, projections, Gordon Growth & Exit Multiple TV, equity bridge |
| **Split-Screen Layout** | Done | Resizable drag divider (25–75%), mobile tab fallback at <768px |
| **Live Recalculation** | Done | Debounced 100ms, no "Run" button — always live |
| **DCF Input Panel** | Done | 8 accordion sections: Company Info, Historical Financials, Revenue Forecast, Cost Structure, Working Capital, WACC, Terminal Value, Equity Bridge |
| **DCF Output Panel** | Done | Valuation Summary, UFCF Table, Football Field Chart, Sensitivity Table, Tornado Chart |
| **Sensitivity Analysis** | Done | 2D heat-map table (Terminal Growth vs Risk-Free Rate), color-coded green/red variance |
| **Tornado Chart** | Done | Top 10 input drivers sorted by impact, horizontal stacked bars via Recharts |
| **Football Field Chart** | Done | 5 valuation ranges (Gordon Growth, Exit Multiple, WACC, Revenue Growth, Margin), horizontal bar chart with base-case reference line |
| **3 AI Data Modes** | Done | Manual / Paste & Parse / AI Auto-populate toggle with amber badge system |
| **AI Per-Field Suggest** | Done | Server-side Claude API call for each field with reasoning |
| **AI Auto-Populate** | Done | Company name → full assumption set via Claude |
| **AI Paste & Parse** | Done | Raw text → mapped financial fields |
| **AI Forecast Generation** | Done | Generates revenue growth rates + EBITDA margins from historicals |
| **AI Input Validation** | Done | Contextual explanations for unusual values |
| **PDF/HTML Export** | Done | Server-rendered HTML report with cover page, AI narrative, key assumptions, methodology, disclaimer |
| **Authentication** | Done | Email/password with JWT, login/register pages |
| **Dashboard** | Done | Model list with search, create/delete, type badges |
| **Auto-Save** | Done | 2-second debounced save on every input change |
| **Version History** | Done | Last 10 auto-saves retained, restore any version via modal |
| **Model Sharing** | Done | Generate read-only share link, duplicate to workspace, revoke sharing |
| **Inline Model Rename** | Done | Click model name in header to edit |
| **Code Splitting** | Done | Lazy-loaded routes for Login, Register, Dashboard, DCF, Shared |
| **Error Boundary** | Done | Graceful crash recovery with retry |
| **Unit Tests** | Done | 42 tests (vitest): DCF engine, sensitivity, football field |

### Not Yet Implemented

| Feature | Spec Section | Priority |
|---|---|---|
| LBO Model | 7.2 | High |
| M&A / Merger Model | 7.3 | High |
| Comparable Company Analysis | 7.4 | Medium |
| Three-Statement Integration | 6.1 | High (LBO dependency) |
| Circularity Solver | 6.2 | High (LBO dependency) |
| Configurable Sensitivity Tables | 8.1 | Medium (currently auto-generated) |
| Cross-Model Football Field | 9 | Medium (needs LBO/Comps) |
| Puppeteer PDF Generation | 10.1 | Low (HTML export works) |
| Google SSO | 11.1 | Low |
| Model Folders/Organization | 11.2 | Low |

---

## 1. Product Overview

FinModel AI is a web-based financial modeling platform targeting junior analysts who understand financial theory but need speed. It provides a split-screen interface — inputs on the left, live-updating outputs on the right — across four core modeling workflows, with Claude AI acting as an intelligent co-pilot for assumptions, data entry, and narrative generation.

The defining philosophy: **the app does the spreadsheet work; the analyst does the thinking.**

---

## 2. Target User

**Primary:** Junior investment banking analysts, PE associates, and equity research associates (1–3 years experience). They know what WACC is. They don't want to build a three-statement model from scratch at 2am.

**Secondary:** Corporate development professionals running quick valuation sanity checks.

**Non-target for v1:** Non-finance executives, sophisticated quants building custom factor models.

---

## 3. Supported Model Types

All four models are supported from day one, accessible from a unified dashboard. The user selects the model type upfront, then enters a dedicated input/output flow.

| Model | Primary Output | Complexity |
|---|---|---|
| DCF (Discounted Cash Flow) | Enterprise Value / Equity Value range | High |
| LBO (Leveraged Buyout) | IRR, MOIC, equity return sensitivity | Very High |
| M&A / Merger Model | Accretion / Dilution to EPS, pro forma balance sheet | High |
| Comparable Company Analysis | Implied valuation range from peer multiples | Medium |

---

## 4. Application Architecture

### 4.1 Layout

**Split-screen paradigm** at all times:
- **Left pane (40%):** Structured input form, organized into collapsible sections. Inputs update the model in real time on every keystroke/blur.
- **Right pane (60%):** Live output dashboard. Updates within ~500ms of any input change. No "Run Model" button — the model is always live.

On mobile / narrow viewports: tab-based switching between Input and Output views.

### 4.2 Dashboard (Home Screen)

- List of the user's saved models (name, model type, company, last modified)
- "New Model" button → modal to select model type → enters dedicated flow
- Search and filter saved models
- Each model card shows a one-line valuation summary (e.g. "DCF: $42–58 / share")

### 4.3 Navigation Within a Model

Each model is organized into **sections** rendered as a left-pane accordion:

**DCF sections:** Company & Industry → Historical Financials → Revenue Forecast → Cost Structure → Working Capital & Capex → WACC Inputs → Terminal Value → Output

**LBO sections:** Target Company → Entry Assumptions → Debt Structure → Operating Assumptions → Exit Assumptions → Returns Analysis → Output

**M&A sections:** Acquirer Financials → Target Financials → Deal Terms → Synergies → Pro Forma → Accretion/Dilution → Output

**Comps sections:** Subject Company → Peer Selection → Multiple Selection → Implied Valuation → Output

---

## 5. AI Integration

### 5.1 Three AI Data Modes

The user chooses their data entry mode at the start of each model session via a clearly labeled toggle. All three modes can be mixed within a session.

**Mode A — Manual Entry**
User types all inputs. No AI involvement in data. AI is still available for per-field suggestions via the "AI suggest" button.

**Mode B — Paste & Parse**
User pastes raw financial data — a 10-K excerpt, a copied table from a data terminal, an earnings release. Claude parses it, identifies the relevant line items, maps them to the model's input schema, and pre-populates fields. User reviews and confirms. Ambiguous mappings are flagged with a yellow highlight and a tooltip explaining Claude's interpretation.

**Mode C — AI Auto-populate**
User enters a company name and/or describes the business ("mid-market industrial distributor, ~$200M revenue"). Claude auto-populates all assumption fields it can infer from training knowledge. **All auto-populated fields are visually marked** with an amber "AI" badge. A prominent disclaimer: *"AI-generated figures may be outdated or approximate. Verify against current filings before use in live analysis."* The user must explicitly acknowledge this disclaimer once per session.

### 5.2 Per-Field AI Suggestions ("AI Suggest" Button)

Every input field has a small **"✦ Suggest"** button to its right. When clicked:
- Claude evaluates the field in the context of the company/industry already entered
- Returns a suggested value with a confidence range (e.g. "WACC: 9.5% — typical range for B2B SaaS: 8.5–11%")
- Explains the reasoning in 1–2 sentences (e.g. "Based on a beta of ~1.2 for software, 10-year risk-free rate ~4.2%, and ERP ~5%")
- User can accept (one click) or ignore

This fires **only on explicit user action** — never proactively.

### 5.3 Input Validation with AI Explanation

When a user enters a value outside normal bounds, the field does **not** hard-block. Instead:
- The field border turns amber
- A tooltip appears with Claude's contextual explanation of why the value is unusual (e.g. "A terminal growth rate of 6% implies the company will eventually grow faster than the global economy — this is mathematically possible but rarely defensible in a valuation")
- The model continues to compute with the entered value
- Extreme values (e.g. negative EBITDA margin > 50%, leverage > 15x) trigger a more prominent inline warning banner

The analyst is trusted to make the final call.

### 5.4 AI Forecast Generation

For projection periods (5–10 years), Claude generates a complete initial forecast based on:
- Company name / industry description
- Historical financials (if provided)
- Selected industry benchmarks

The full forecast table is pre-populated in an editable grid. **Every AI-generated cell is highlighted in amber.** The user edits exceptions — cells they change turn white and are treated as hard-coded overrides. The user can "reset to AI forecast" on any cell or the entire table.

The projection period length (5 / 7 / 10 years) is user-configurable per model.

---

## 6. Three-Statement Integration & Circularity

### 6.1 Scope

All models requiring it implement **full three-statement integration**: Income Statement → Cash Flow Statement → Balance Sheet, with proper accrual linkages (retained earnings roll-forward, working capital changes, D&A, deferred taxes, etc.).

### 6.2 Circularity Handling

The revolving credit facility / interest expense circular reference is resolved using an **iterative Newton-Raphson solver** running in a Web Worker (non-blocking):

1. On each model update, the solver runs up to **100 iterations** with a convergence tolerance of **$1,000** on the revolver balance
2. A subtle spinner appears in the output pane header while solving
3. **If convergence is achieved:** results render normally. A small green "✓ Converged" badge appears
4. **If convergence fails** (ill-conditioned model, extreme leverage assumptions): the solver **automatically falls back** to beginning-of-period debt for interest calculation (avoids the circular reference), renders results, and displays a prominent amber banner: *"Model did not fully converge. Interest expense calculated using beginning-of-period debt balance. Results may differ slightly from a fully iterative model. Consider reviewing leverage assumptions."*
5. The user can click "Details" on the convergence warning to see the final iteration delta and which assumption is likely causing instability

This approach ensures the model never crashes or hangs, while being transparent about when simplifying assumptions were applied.

---

## 7. Model-Specific Logic

### 7.1 DCF Model

**Inputs:**
- Company name / description
- Sector / industry (dropdown, feeds AI benchmarks)
- Historical financials: Revenue, EBITDA, D&A, Capex, NWC (3 years minimum)
- Projection period: 5 / 7 / 10 years (toggle)
- Revenue growth rates by year (AI-generated, user-editable)
- EBITDA margin by year (AI-generated, user-editable)
- D&A as % of revenue
- Capex as % of revenue
- Change in NWC as % of revenue change
- Tax rate
- WACC components: Risk-free rate, Equity risk premium, Beta, Pre-tax cost of debt, Capital structure (D/E), per "AI Suggest" or manual
- Terminal value method: Gordon Growth Model (terminal growth rate) OR Exit Multiple (EV/EBITDA)
- Net debt (for bridge to equity value)
- Diluted shares outstanding

**Outputs:**
- UFCF by year (table)
- PV of FCFs
- Terminal value (both methods shown side-by-side)
- Enterprise Value
- Equity Value (bridge shown)
- Implied share price
- Sensitivity tables (see Section 9)

### 7.2 LBO Model

**Debt Schedule — Realistic Structure:**

Three configurable tranches:
- **Senior Secured** (Term Loan A / B): Amount, interest rate (fixed or SOFR + spread), amortization schedule (% per year), maturity
- **Mezzanine / Second Lien**: Amount, PIK toggle (cash vs. PIK interest), rate, maturity
- **Revolving Credit Facility**: Commitment size, drawn amount, rate — participates in circularity solver

**Cash Sweep:** Excess cash flow after mandatory amortization sweeps to senior debt repayment (configurable sweep %: 50% / 75% / 100%).

**Covenant Tests (calculated, not enforced):**
- Net Leverage Ratio (Net Debt / EBITDA) — displayed by year
- Interest Coverage Ratio (EBITDA / Interest Expense) — displayed by year
- If either breaches a user-defined threshold, a red flag appears on that year in the output table

**Entry / Exit:**
- Entry: EV/EBITDA multiple, LTM EBITDA, implied enterprise value, financing structure
- Exit: Year (3 / 4 / 5 / 6), EV/EBITDA exit multiple (AI suggests based on entry multiple and industry)
- Management rollover % (optional)

**Returns:**
- IRR (pre- and post-management)
- Money-on-invested-capital (MOIC)
- Returns sensitivity table: Entry multiple × Exit multiple

### 7.3 M&A / Merger Model

**Financing Mix:**
AI suggests a typical mix based on deal size input:
- < $500M: typically all-cash or cash + debt
- $500M–$5B: cash + debt mix, sometimes stock component
- > $5B: often stock-heavy

User can override the mix. Three sliders: Cash % / Stock % / Debt % (must sum to 100%).

**Purchase Price Allocation:**
- Goodwill = Purchase Price − Fair Value of Net Assets
- PP&E write-up (user-configurable %)
- Intangibles step-up
- Deferred tax liability on write-ups (auto-calculated)

**Pro Forma Adjustments:**
- Cost synergies: phased-in over 1–3 years, user-defined run-rate amount
- Revenue synergies: separate line, user-defined with explicit caveat that banks typically exclude from base case
- One-time transaction costs (advisory, financing, restructuring)

**Output:**
- Standalone vs. pro forma EPS comparison
- Accretion / (Dilution) in $ and % by year (Year 1, Year 2, Year 3)
- Pro forma income statement
- Pro forma balance sheet with goodwill and PPA
- Break-even synergies (minimum synergies required to be EPS-neutral)

### 7.4 Comparable Company Analysis

**Peer data sources (all three modes available):**
1. **Manual:** User adds peer companies and manually enters EV, EBITDA, Revenue, Net Income, P/E for each
2. **AI Benchmarks:** User enters industry / sub-sector. Claude provides typical multiple ranges from training knowledge (displayed as ranges, not point estimates, with a staleness disclaimer)
3. **Paste & Parse:** User pastes a comps table from CapIQ or Bloomberg. Claude parses company names, identifies metrics, maps to schema.

**Multiples calculated:** EV/EBITDA, EV/Revenue, P/E (NTM and LTM where available)

**Output:** For each multiple, implied valuation of the subject company at 25th percentile, median, and 75th of the peer set. Presented as a horizontal range bar.

---

## 8. Sensitivity Analysis

### 8.1 Sensitivity Tables

Every model includes a **Sensitivity Analysis** section in the output pane. The user can create up to **4 sensitivity tables** per model.

**Table configuration:**
- X-axis: select any numeric input from the model (dropdown of all inputs)
- Y-axis: select any numeric input from the model
- Output metric: select from the model's key outputs (e.g. Implied Share Price, IRR, Accretion %)
- Number of steps per axis: 3 / 5 / 7 (default: 5)
- Step size: absolute or % deviation from base case (user chooses)

**Default tables pre-generated by model type:**
- DCF: WACC × Terminal Growth Rate → Implied Share Price
- LBO: Entry Multiple × Exit Multiple → IRR; also Entry Multiple × Exit Multiple → MOIC
- M&A: Revenue Synergies × Cost Synergies → Accretion %; also % Stock Consideration × Premium Paid → Dilution
- Comps: No default sensitivity (output is already a range)

**Heat map coloring:** Green for favorable outcomes, red for unfavorable, anchored at the base case (white/neutral).

### 8.2 Tornado Charts

A **Tornado Chart** is available for DCF and LBO models. It shows the impact on the key output metric (Implied Share Price / IRR) of each input variable moving ±10% (or ±1 standard deviation for rate inputs) from its base case value. Variables are sorted by impact magnitude. This identifies the key drivers of the model at a glance.

User can configure: which inputs to include in the tornado, and the sensitivity magnitude (±5% / ±10% / ±20%).

---

## 9. Football Field Chart

When **two or more models** have been run for the same company in the same session, a **Football Field Chart** automatically appears at the top of the output pane.

The chart is a horizontal range bar chart showing:
- DCF implied value range (from sensitivity table min/max, or user-defined bear/bull cases)
- LBO implied entry price range (floor valuation)
- Trading Comps implied range (25th–75th percentile)
- Transaction Comps implied range (if manually entered)
- Current share price marker (optional, user-entered)
- Analyst price target marker (optional, user-entered)

All ranges are displayed on a common axis ($ per share for public companies, or EV for private).

The Football Field is included in the PDF export with an AI-generated interpretation paragraph (see Section 10).

---

## 10. PDF Export & AI Narrative

### 10.1 PDF Report Structure

When the user clicks "Export PDF," Claude generates a complete analytical report:

1. **Cover page:** Company name, model type(s), date, analyst name (from account)
2. **Executive Summary:** 2–3 paragraph AI-generated narrative summarizing the key findings, valuation range, and primary drivers
3. **Football Field Chart** (if multiple models run)
4. **Model Outputs:** Key output tables and charts for each model run
5. **Sensitivity Tables:** All configured sensitivity tables with heat map coloring preserved
6. **Key Assumptions:** Summary table of all user-entered and AI-suggested assumptions, with AI suggestions clearly marked
7. **Model Methodology Notes:** Brief description of the methodology used (e.g., "Terminal value calculated using Gordon Growth Model with a 2.5% perpetuity growth rate")
8. **Disclaimer:** Standard disclaimer that all projections are forward-looking estimates based on assumptions that may not materialize

### 10.2 AI Narrative Generation

The AI narrative is generated via Claude API call at export time. The prompt includes:
- All model inputs and outputs
- Which assumptions were AI-generated vs. user-entered
- Whether the model converged or fell back to simplified circularity handling
- Whether any validation warnings were triggered

The narrative:
- Describes the valuation range in plain English
- Highlights the two or three biggest drivers of value (cross-referenced with tornado chart results)
- Notes any assumptions flagged as unusual
- Interprets the Football Field chart if present (e.g., "The LBO floor of $38 and the DCF central case of $52 suggest a meaningful premium exists relative to the current trading price of $41")
- **Does not make investment recommendations** — it describes what the model shows, not what to do

The user can regenerate the narrative with a "Regenerate" button. They can also provide a short prompt ("focus on downside risks") to steer the narrative.

---

## 11. User Accounts & Persistence

### 11.1 Authentication

Email + password authentication with optional SSO (Google). No anonymous sessions for saved models (anonymous users can run models but cannot save).

### 11.2 Saved Models

- Every model is auto-saved to the cloud on every input change (debounced, 2-second delay)
- Models are stored as structured JSON (all inputs, assumption overrides, AI-generated values, sensitivity table configurations)
- Users can name models, add a description tag, and organize into folders
- **Version history:** Last 10 auto-saves are retained. User can restore any prior version.

### 11.3 Model Sharing

- "Share" button generates a read-only link. Recipients can view the model and outputs but cannot edit.
- "Duplicate to my workspace" button on shared models allows recipients to fork and edit their own copy.
- No real-time collaboration in v1.

---

## 12. Technical Architecture

### 12.1 Frontend

- **Framework:** React 18 (TypeScript), Vite 6
- **State management:** Zustand 5 (model state), TanStack React Query 5 (API calls)
- **Calculation engine:** Pure TypeScript, runs entirely client-side with 100ms debounce. No server round-trips for model computation.
- **Charts:** Recharts 2 for all output charts (tornado, football field)
- **Sensitivity table heat maps:** HTML table with interpolated green/red color values
- **Testing:** Vitest (42 unit tests covering DCF engine, sensitivity, football field)
- **Code splitting:** React.lazy with Suspense for route-level splitting

### 12.2 Backend

- **API:** REST (Node.js / Express)
- **Database:** SQLite (better-sqlite3) with WAL mode — stores user accounts and model JSON blobs
- **Auth:** JWT (jsonwebtoken + bcryptjs)
- **AI calls:** Anthropic Claude API (@anthropic-ai/sdk) — called server-side to protect API key. Endpoints: `/api/ai/suggest`, `/api/ai/auto-populate`, `/api/ai/parse`, `/api/ai/validate`, `/api/ai/forecast`, `/api/ai/narrative`
- **PDF generation:** Server-rendered HTML report (Puppeteer can be added for true PDF output)

### 12.3 Calculation Engine Design

The calculation engine is a **pure functional module** — given a complete set of model inputs, it returns a complete set of model outputs. No side effects.

```
type ModelInputs → ModelOutputs
```

This enables:
- Real-time recalculation on every input change (called from UI thread via Web Worker)
- Sensitivity table generation (batch calls with varied inputs)
- Tornado chart generation (batch calls varying one input at a time)
- Deterministic testing

**Circularity solver interface:**
```
solveWithCircularity(inputs: ModelInputs, maxIter: number, tolerance: number): 
  { outputs: ModelOutputs, converged: boolean, finalDelta: number }
```

---

## 13. Edge Cases & Known Hard Problems

| Problem | Handling |
|---|---|
| Iterative solver non-convergence | Auto-fallback to beginning-of-period debt, amber warning banner, "Details" link showing final delta |
| Negative EBITDA (distressed company DCF) | Allowed. UFCF is calculated correctly. WACC discount still applies. Prominent note that DCF has limited applicability for pre-profitability companies. |
| Terminal growth rate ≥ WACC | Hard validation error — this produces a negative or infinite terminal value. The only hard block in the app. |
| Zero or negative equity value in LBO | Allowed. Displayed as "Equity wiped out" in returns section. IRR cannot be calculated and is shown as "N/M". |
| M&A: dilutive deal with negative synergies | Allowed. EPS impact shown as negative. Break-even synergies shown as the minimum to get to 0% dilution. |
| AI parse failure (paste & parse) | Displays which fields were successfully parsed and which failed. Failed fields remain blank for manual entry. |
| Projection period mismatch (M&A: acquirer 10-year, target 5-year) | UI enforces matching projection periods. Changing one prompts to update both. |
| LBO covenant breach | Displayed visually (red cell) but does not block the model. Banner: "Model shows covenant breach in Year X. This deal structure may require amendment or renegotiation." |
| Comps: AI benchmarks are stale | Disclaimer on every AI-sourced multiple: "Benchmarks from AI training data — verify against current market data." Multiples displayed as ranges (not point estimates) to communicate uncertainty. |

---

## 14. Out of Scope for V1

The following are explicitly deferred:

- **Excel export with live formulas** — browser-generated XLSX with formulas is technically feasible but fragile and time-consuming to maintain correctly across model complexity. Post-v1.
- **Real-time market data integration** (Bloomberg, CapIQ APIs) — cost and complexity. Users paste data or use AI benchmarks.
- **Monte Carlo simulation** — referenced in the source document as best practice, but requires significant additional UX surface area. Post-v1.
- **Real-time collaboration** (multiple editors simultaneously) — post-v1.
- **Sum-of-the-Parts (SOTP) model** — post-v1.
- **Fixed income / options / derivatives modeling** — separate product surface area.
- **Mobile-first experience** — the split-screen paradigm does not translate well to small screens. Responsive read-only view for mobile; full editing requires desktop viewport.

---

## 15. Design Principles

1. **The model is always live.** There is no "Calculate" button. Outputs update in real time.
2. **AI suggestions are explicit, not automatic.** The analyst asks for help; the AI doesn't impose.
3. **Every AI-generated value is visually distinguishable** from analyst-entered values at all times (amber badge system).
4. **Warnings inform, they don't block.** Only one hard validation error exists (terminal growth ≥ WACC). Everything else allows the analyst to proceed with clear information.
5. **The PDF is the deliverable.** All design decisions about output richness serve the goal of producing a report an analyst could put in front of a senior banker or client.
6. **Fail gracefully.** Convergence failures, AI parse failures, and edge case inputs all produce degraded-but-useful output rather than errors.

---

## 16. Open Questions for Next Phase

1. **Pricing model:** Per-seat SaaS vs. per-export vs. freemium (limited models free, full access paid)?
2. **Firm/team accounts:** Should multiple analysts at the same firm share a model library, or is it individual?
3. **Audit trail:** Should every change to a saved model be logged with timestamp + user for compliance purposes?
4. **Custom assumption templates:** Should firms be able to define "house" WACC assumptions or standard debt structures that pre-populate for their analysts?
5. **Comps database:** Is there appetite post-v1 to license a data provider (e.g., Intrinio, Financial Modeling Prep) to auto-populate live peer multiples, replacing the AI benchmark approach?
