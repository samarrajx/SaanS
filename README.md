# Saans (साँस) — AI Clean-Air Assistant for Families & Communities

> **Navigating Severe Winter Smog with Science-Backed Indoor Physics, Personalized Routines, and Honest Guidance**  
> Live Deployment: [https://saans.vercel.app](https://saans.vercel.app)

---

## 1. The Challenge & Chosen Approach

Every winter, millions of families and communities across the Indo-Gangetic Plain (Delhi-NCR, Patna, Lucknow, Kanpur, and surrounding regions) face catastrophic air pollution. Temperature inversions trap vehicular exhaust, crop residue smoke, industrial emissions, and construction dust, driving PM2.5 concentrations beyond $300\text{–}500\ \mu g/m^3$ (AQI 400+ "Severe").

Most air quality apps merely display a frightening red number or push commercial purifiers. Families need **actionable, realistic, and budget-conscious routines**:

- When is the safest hour to send children to school or ventilate the kitchen?
- What if a family cannot afford a ₹15,000 HEPA purifier? Can a ₹400 DIY box-fan filter or sealing window drafts actually protect an infant or asthmatic grandparent?
- How can a Resident Welfare Association (RWA) or municipal school coordinate collective action during a Severe alert?

**Saans** combines **first-principles atmospheric and indoor physics** with the conversational reasoning of **Google Gemini 3.8 Flash**, delivering transparent, localized, and multi-generational clean-air guidance in **English, हिन्दी (Hindi), and Hinglish**.

---

## 2. What Saans Does

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 SAANS SUITE                                 │
├───────────────┬───────────────┬───────────────┬───────────────┬─────────────┤
│  Today View   │   Day Plan    │ Home Air Lab  │     Swaps     │  Community  │
│  NAQI & Top 3 │ Hourly Blocks │ Physics Sim   │ Impact Ledger │  Circulars  │
│    Actions    │  .ics Export  │ Before/After  │  CO2e & PM    │ Print Notice│
└───────────────┴───────────────┴───────────────┴───────────────┴─────────────┘
```

1. **Today View**:
   - Real-time headline **CPCB-compliant NAQI** (24-hour rolling mean) and dominant pollutant identification.
   - Hourly forecast strip chart rendered via lightweight inline SVG with an **accessible data table toggle**.
   - **Do These 3 Things Today**: Deterministically ranked, high-impact actions tailored to household vulnerability, budget band, and heating/cooking fuel.
   - **Activity & Ventilation Windows**: Exact cleanest outdoor windows (typically 1 PM – 3 PM) and morning inversion seal warnings.
2. **Day Plan View**:
   - Hour-by-hour timeline schedule linking daily routines (school run, commute, cooking, room cleaning, night seal) with specific mitigation actions.
   - **RFC 5545 `.ics` Calendar Export** for importing reminder alerts directly into Google Calendar or Apple Calendar.
3. **Home Air Lab**:
   - Interactive indoor air quality simulation powered by a **physical mass-balance differential equation**.
   - Real-time before/after PM2.5 response curves demonstrating the impact of purifiers, DIY fan filters, and window sealing.
   - "Why This?" modal detailing the underlying physical assumptions and equations.
4. **Swaps View & Running Impact Ledger**:
   - Catalog of low-emission alternatives across commute (metro vs. car), cooking (induction vs. unvented biomass), heating, and waste burning.
   - Dynamic **Running Impact Ledger** tracking estimated weekly exposure avoided ($\mu g/m^3 \cdot h$), avoided particulate mass ($mg$), and carbon impact ($kg\ \text{CO}_2e$).
5. **Community Mode**:
   - Actionable checklists for **Resident Welfare Associations (RWAs)**, **Schools**, and **Mohallas/Wards** with AQI-triggered tiers (Poor, Very Poor, Severe).
   - **AI Notice Generator**: Drafts circulars tailored for WhatsApp groups, formal administrative emails, and physical notice boards.
   - **Print-Friendly One-Pager (`window.print()`)** formatted for physical printouts and notice boards.
6. **Clean-Air Assistant (Ask)**:
   - Grounded conversational assistant with 4 prompt pills.
   - **Allowlisted Patch Engine**: AI-suggested changes to household settings (e.g., window habits, purifier CADR, budget band) generate visual diffs with **Apply to Profile** and **Undo** buttons.
7. **Settings & Data Control**:
   - Instant language switching between English, Hindi, and Hinglish.
   - **JSON Backup Export & Restore** for portable offline profile ownership.
   - **Delete All My Data** with modal confirmation.

---

## 3. Core Philosophy: _"The Model Judges, Code Calculates"_

```
                              ┌─────────────────────────────────────┐
                              │       Open-Meteo CAMS Ensemble      │
                              └──────────────────┬──────────────────┘
                                                 │
                                                 ▼
                              ┌─────────────────────────────────────┐
                              │     SSRF-Safe Serverless Proxy      │
                              │    (60-min Cell Cache, Origin)      │
                              └──────────────────┬──────────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        ▼                                                 ▼
      ┌───────────────────────────────────┐             ┌───────────────────────────────────┐
      │     Deterministic Code Engine     │             │       Gemini 3.8 Flash API        │
      │   (Coded Mathematical Reality)    │             │      (Context & Judgement)        │
      ├───────────────────────────────────┤             ├───────────────────────────────────┤
      │ • NAQI Sub-Index Interpolation    │             │ • Empathetic Family Narrative     │
      │ • Physical Mass-Balance Box Model │────────────▶│ • Contextualized Advice           │
      │ • Microenvironmental Exposure     │             │ • Multilingual Circular Drafting  │
      │ • Constrained Action Ranking      │             │ • Allowlisted Patch Proposals     │
      └───────────────────────────────────┘             └───────────────────────────────────┘
                        │                                                 │
                        └────────────────────────┬────────────────────────┘
                                                 ▼
                              ┌─────────────────────────────────────┐
                              │     Zero-Framework UI Layer         │
                              │  (Native ES Modules, Safe DOM APIs, │
                              │   WAI-ARIA Accessibility, Print CSS)│
                              └─────────────────────────────────────┘
```

Generative AI should never guess air quality numbers, invent medical statistics, or perform ungrounded arithmetic. In Saans:

- **Code calculates**: NAQI sub-indices, mass-balance differential decay, exposure intervals, and budget filters are executed 100% deterministically by audited mathematical functions.
- **The model judges**: Gemini synthesizes the computed metrics into supportive, actionable guidance, context-sensitive day routines, and community circulars.
- **Offline Fallback**: If the Gemini API is blocked or credentials are unavailable, the deterministic engine automatically supplies a complete baseline plan and local advice.

---

## 4. How It Works

### A. NAQI Calculation (CPCB Standard)

The National Air Quality Index (NAQI) uses linear interpolation between breakpoint concentrations defined by the Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change:

$$I = I_{low} + \frac{I_{high} - I_{low}}{C_{high} - C_{low}} (C - C_{low})$$

Where $C$ is the 24-hour rolling mean concentration of PM2.5 or PM10. The dominant pollutant with the maximum sub-index defines the headline AQI.

### B. Physical Indoor Mass-Balance Box Model

Indoor air quality across time is simulated using the continuous physical differential equation:

$$\frac{dC_{in}}{dt} = \frac{P \cdot a \cdot C_{out}(t)}{V} - \left(a + k + \frac{CADR}{V}\right) C_{in}(t) + \frac{S}{V}$$

- $P$: Building envelope penetration factor
- $a$: Air exchange rate (air changes per hour, $h^{-1}$)
- $k$: Surface deposition rate ($0.2\ h^{-1}$)
- $CADR$: Clean Air Delivery Rate ($m^3/h$)
- $V$: Room volume ($m^3$)
- $S$: Indoor emission rate ($\mu g/h$)

Analytical steady state:

$$C_{ss} = \frac{P \cdot a \cdot C_{out} + S / V}{a + k + CADR / V}$$

### C. Microenvironmental Exposure & Burden

Daily inhaled particulate mass is calculated across time-activity microenvironments:

$$E = \sum_{j} C_j \cdot t_j, \qquad D = \sum_{j} C_j \cdot I_j \cdot t_j$$

Where $I_j$ is the microenvironment inhalation rate ($m^3/h$) based on exertion level (sleep, sedentary desk work, commute, active exercise).

---

## 5. Physical Assumptions & Sources

| Parameter                      | Default Value                                                       | Source / Scientific Basis     |
| :----------------------------- | :------------------------------------------------------------------ | :---------------------------- |
| **Penetration Factor ($P$)**   | Leaky: `0.70`, Average: `0.55`, Tight: `0.40`                       | typical range (assumption)    |
| **Air Exchange Rate ($a$)**    | Open: `1.5` $h^{-1}$, Mixed: `0.8` $h^{-1}$, Closed: `0.3` $h^{-1}$ | typical range (assumption)    |
| **Deposition Rate ($k$)**      | `0.20` $h^{-1}$                                                     | typical range (assumption)    |
| **Rest Inhalation Rate**       | `0.45` $m^3/h$                                                      | typical range (assumption)    |
| **Commute Inhalation Rate**    | `0.80` $m^3/h$                                                      | typical range (assumption)    |
| **Active Exercise Inhalation** | `1.80` $m^3/h$                                                      | typical range (assumption)    |
| **N95 Mask Filtration**        | `95%` efficiency (High confidence range: `80%–95%` fit factor)      | NIOSH 42 CFR Part 84 standard |
| **DIY Box-Fan Filter CADR**    | `180` $m^3/h$                                                       | typical range (assumption)    |
| **Commercial Purifier CADR**   | `250` $m^3/h$                                                       | typical range (assumption)    |

---

## 6. Security, Privacy & Efficiency

### Security Architecture

- **Zero Secrets in Repository**: Gemini API keys are read solely from serverless environment variables (`GEMINI_API_KEY`).
- **SSRF-Safe Proxies**: `/api/air` and `/api/geocode` restrict upstream requests to hardcoded Open-Meteo domains with whitelisted query parameters and 32 KB response limits.
- **Strict Content Security Policy (CSP)**: Configured in `vercel.json` with `default-src 'self'`, `connect-src 'self'`, `frame-ancestors 'none'`, and zero external font or script requests.
- **Safe DOM APIs**: All frontend rendering uses `textContent` and programmatic DOM creation. **Zero user or model text is ever assigned via `innerHTML`**.
- **Prompt Injection Defense**: User queries sent to `/api/assist` are wrapped in XML tags with all angle brackets sanitized.

### Data Privacy

- **Strict Data Minimization**: Household names, full street addresses, and medical diagnoses are **never** requested or stored.
- **Local Storage Ownership**: All profile settings reside inside the user's browser `localStorage`, with full JSON backup export and instant data wipe capabilities.
- **Coarse Coordinates**: Coordinates sent to `/api/air` are rounded to 2 decimal places ($\sim 1.1\text{ km}$ grid) and never logged.

### Efficiency & Zero-Framework Performance

- **Zero Bundle Step**: Native ES Modules (`type="module"`), vanilla JavaScript, and CSS custom properties.
- **Lightweight Inline SVG**: All charts are generated inline with semantic SVGs—no chart libraries required.
- **Total Repository Footprint**: Entire repository is **~421 KiB**, well below the 10 MB limit.
- **Server Caching**: 60-minute in-memory cache for weather and air quality grid cells.

---

## 7. Verification & Test Suite Report

All metrics below are generated directly by `npm run report` using Node.js built-in test runner (`node --test`) and code coverage tools.

- **Node.js Version**: `v22.23.5`
- **Total Tests**: `92`
- **Passed**: `92`
- **Failed**: `0`
- **Aggregate Coverage**: Line: 95.56% | Branch: 84.97% | Function: 85.85%
- **NPM Audit**: `0 vulnerabilities`
- **TypeScript**: `0 errors` (`strict: true`, `checkJs: true`)
- **ESLint**: `0 errors, 0 warnings` (Max 40 lines per function, max 250 lines per file)

### Code Coverage Breakdown

| Module / File                  | Line Coverage | Branch Coverage | Function Coverage |
| :----------------------------- | :------------ | :-------------- | :---------------- |
| `api/_lib/cache.js`            | 93.02%        | 84.62%          | 100.00%           |
| `api/_lib/gemini.js`           | 100.00%       | 93.10%          | 100.00%           |
| `api/_lib/security.js`         | 98.59%        | 93.10%          | 88.89%            |
| `api/air.js`                   | 100.00%       | 68.00%          | 100.00%           |
| `api/assist.js`                | 100.00%       | 81.25%          | 100.00%           |
| `api/geocode.js`               | 100.00%       | 83.33%          | 100.00%           |
| `api/notice.js`                | 100.00%       | 95.00%          | 100.00%           |
| `api/ping.js`                  | 100.00%       | 100.00%         | 100.00%           |
| `api/plan.js`                  | 100.00%       | 85.71%          | 100.00%           |
| `web/js/engine/actions.js`     | 100.00%       | 100.00%         | 100.00%           |
| `web/js/engine/assumptions.js` | 100.00%       | 100.00%         | 100.00%           |
| `web/js/engine/baseline.js`    | 97.01%        | 73.33%          | 100.00%           |
| `web/js/engine/breakpoints.js` | 100.00%       | 100.00%         | 100.00%           |
| `web/js/engine/community.js`   | 100.00%       | 66.67%          | 100.00%           |
| `web/js/engine/exposure.js`    | 100.00%       | 94.44%          | 100.00%           |
| `web/js/engine/format.js`      | 100.00%       | 81.25%          | 100.00%           |
| `web/js/engine/ics.js`         | 100.00%       | 100.00%         | 100.00%           |
| `web/js/engine/impact.js`      | 100.00%       | 97.22%          | 100.00%           |
| `web/js/engine/indoor.js`      | 98.10%        | 80.77%          | 100.00%           |
| `web/js/engine/money.js`       | 98.44%        | 83.33%          | 100.00%           |
| `web/js/engine/naqi.js`        | 100.00%       | 100.00%         | 100.00%           |
| `web/js/engine/patch.js`       | 92.45%        | 71.79%          | 87.50%            |
| `web/js/engine/rank.js`        | 100.00%       | 81.25%          | 100.00%           |
| `web/js/engine/scenarios.js`   | 100.00%       | 87.50%          | 100.00%           |
| `web/js/engine/schedule.js`    | 100.00%       | 100.00%         | 100.00%           |
| `web/js/locales/en.js`         | 100.00%       | 100.00%         | 100.00%           |
| `web/js/locales/hi.js`         | 100.00%       | 100.00%         | 100.00%           |
| `web/js/locales/hinglish.js`   | 100.00%       | 100.00%         | 100.00%           |
| `web/js/router.js`             | 49.40%        | 40.00%          | 9.09%             |
| `web/js/storage.js`            | 84.35%        | 78.95%          | 75.00%            |
| `web/js/ui/action-card.js`     | 81.25%        | 100.00%         | 50.00%            |
| `web/js/ui/announcer.js`       | 100.00%       | 60.00%          | 100.00%           |
| `web/js/ui/card.js`            | 89.29%        | 57.14%          | 100.00%           |
| `web/js/ui/chart-line.js`      | 100.00%       | 64.71%          | 100.00%           |
| `web/js/ui/chip.js`            | 94.64%        | 85.71%          | 100.00%           |
| `web/js/ui/data-table.js`      | 98.15%        | 71.43%          | 100.00%           |
| `web/js/ui/form-field.js`      | 99.09%        | 78.57%          | 100.00%           |
| `web/js/ui/inline-form.js`     | 100.00%       | 75.00%          | 100.00%           |
| `web/js/ui/modal.js`           | 90.74%        | 100.00%         | 50.00%            |
| `web/js/ui/patch-diff.js`      | 100.00%       | 100.00%         | 100.00%           |
| `web/js/ui/tabs.js`            | 81.82%        | 91.67%          | 66.67%            |
| `web/js/views/ask.js`          | 95.69%        | 85.71%          | 100.00%           |
| `web/js/views/community.js`    | 92.69%        | 86.36%          | 76.19%            |
| `web/js/views/lab.js`          | 96.76%        | 75.00%          | 78.57%            |
| `web/js/views/onboarding.js`   | 87.10%        | 100.00%         | 53.85%            |
| `web/js/views/plan.js`         | 100.00%       | 100.00%         | 100.00%           |
| `web/js/views/settings.js`     | 85.77%        | 92.31%          | 64.71%            |
| `web/js/views/swaps.js`        | 98.83%        | 77.27%          | 93.33%            |
| `web/js/views/today.js`        | 93.07%        | 93.33%          | 84.62%            |
| **all files**                  | 95.56%        | 84.97%          | 85.85%            |

---

## 8. Running Locally & Deployment

### Prerequisites

- Node.js `>= 22.0.0`
- Vercel CLI (optional, for local serverless execution)

### 1. Clone & Install

```bash
git clone https://github.com/samarraj/saans.git
cd saans
npm install
```

### 2. Run Verification Pipeline

```bash
npm run format:check   # Prettier check
npm run lint           # ESLint with strict 40-line function limits
npm run typecheck      # TypeScript in strict mode
npm test               # Run all 92 unit & API tests
npm run report         # Full test and coverage report
```

### 3. Run Locally with Vercel CLI

Copy `.env.example` to `.env` or export environment variables:

- `GEMINI_API_KEY`: Your Google AI Studio API key (optional; if omitted, the deterministic baseline rule engine runs with zero external AI dependencies).
- `GEMINI_MODEL`: Model identifier (defaults to `"gemini-3.8-flash"`).

```bash
# Set your Gemini API key and model in local environment
export GEMINI_API_KEY="your-gemini-api-key"
export GEMINI_MODEL="gemini-3.8-flash"

# Start the Vercel local dev server (serves web/ and api/)
npx vercel dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Deploying to Vercel

Deploy directly to Vercel with zero build configuration:

```bash
npx vercel --prod
```

Ensure `GEMINI_API_KEY` and optional `GEMINI_MODEL` (defaults to `"gemini-3.8-flash"`) are configured in your Vercel Project Environment Variables.

---

## 9. Limitations & Public Health Disclaimer

1. **Forecast Resolution**: Meteorological and air quality forecasts are provided by the **CAMS ENSEMBLE** model via Open-Meteo under CC BY 4.0. Spatial resolution is $\sim 25\text{–}45\text{ km}$; micro-local hotspots (e.g., immediate proximity to a roadside tandoor or brick kiln) may experience higher concentrations.
2. **PM-Dominant Index**: In severe winter inversion, fine particulates (PM2.5 and PM10) represent $> 90\%$ of the health burden. While gaseous co-pollutants ($NO_2, SO_2, CO$) contribute to atmospheric chemistry, Saans focuses calculations on particulate mass and lung infiltration.
3. **Medical Disclaimer**: **Saans provides general educational, environmental, and engineering guidance—not medical advice or diagnostic services.** Individuals experiencing chest pain, persistent wheezing, or severe shortness of breath should immediately seek emergency medical attention from a qualified healthcare practitioner.

---

## 10. Data Sources & Attribution

- **Air Quality & Weather Forecasts**: CAMS ENSEMBLE model via [Open-Meteo](https://open-meteo.com) under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).
- **AQI Standards**: National Air Quality Index (NAQI) breakpoints defined by the Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change, Government of India.
- **Population Inhalation Baselines**: Inhalation and microenvironment exposure parameters adapted from the US EPA Exposure Factors Handbook and peer-reviewed indoor air quality literature.
