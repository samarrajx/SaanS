# Saans System Architecture

> **AI Clean-Air Assistant for Families & Communities in India**  
> Navigating severe winter smog and urban air pollution with honest, science-backed guidance.

---

## 1. Core Architectural Philosophy: _"The Model Judges, Code Calculates"_

In high-stakes public health contexts like toxic winter smog, generative AI models can hallucinate numerical calculations, invent non-existent statistics, or present false precision.

Saans enforces an architectural boundary:

1. **Deterministic Code Calculates**:
   - NAQI sub-index interpolation strictly conforms to the **CPCB (Central Pollution Control Board)** mathematical standard.
   - Indoor air quality is simulated using a **first-principles mass-balance differential equation** ($V \frac{dC}{dt} = P \cdot a \cdot C_{out} - (a + k + \frac{CADR}{V}) V C$).
   - Exposure reduction intervals and costs are calculated by verified formulas and displayed as **honest ranges**, not false single-point numbers.
   - Schedule windows (e.g. cleanest outdoor hours, morning inversion seals) are determined deterministically from hourly meteorological forecasts.
2. **Generative Model Judges & Contextualizes**:
   - The Gemini model translates complex numerical realities into empathetic, actionable household guidance.
   - It synthesizes personalized multi-generational day routines (e.g., asthmatic elder, school-going child, office commuter).
   - It crafts audience-specific circulars for Resident Welfare Associations (RWAs), schools, and mohalla committees in English, Hindi, and Hinglish.

---

## 2. End-to-End Data Flow

```
[ Open-Meteo CAMS Ensemble ]
             │ (Hourly PM2.5, PM10)
             ▼
      [ /api/air Proxy ] ── (60-min Cell Cache, Origin & Rate Check)
             │
     ┌───────┴────────────────────────┐
     ▼                                ▼
[ Offline Fallback Engine ]     [ Gemini 3.8 Flash Tool Loop ]
     │                                │ (Structured Reasoning)
     └───────┬────────────────────────┘
             ▼
   [ JSON Plan / Assist ]
             │
             ▼
[ Client-Side Engine & DOM ] ─── [ LocalStorage (Versioned & Debounced) ]
             │
             ▼
   [ Accessible Native Views ]
   (Today, Day Plan, Home Lab, Swaps, Community, Ask, Settings)
```

1. **Air Data Ingestion**: Client requests air quality for coarse, 2-decimal rounded coordinates (`/api/air?lat=...&lon=...`).
2. **SSRF-Safe Proxy & In-Memory Cache**: The serverless edge proxies requests strictly to `air-quality-api.open-meteo.com`, normalizes hourly series, strips untrusted parameters, and caches responses for 60 minutes.
3. **Plan Generation (`/api/plan`)**:
   - Server fetches air data itself (never trusting client-supplied metrics).
   - Local engine computes baseline schedule, activity windows, and ranked actions.
   - Gemini structures the daily narrative and personalized precautions.
   - If model or key is absent, the engine seamlessly delivers a complete baseline plan labeled as deterministic.
4. **Interactive Simulation (Home Air Lab & Swaps)**: Runs 100% locally in the browser with zero network latency, recomputing mass-balance curves instantly as purifiers, DIY filters, or window habits are toggled.

---

## 3. Physical Mass-Balance Indoor Model

Indoor PM2.5 concentrations are calculated per time step $\Delta t$ using:

$$\frac{dC_{in}}{dt} = \frac{P \cdot a \cdot C_{out}(t)}{V} - \left(a + k + \frac{CADR}{V}\right) C_{in}(t) + \frac{S}{V}$$

Where:

- $C_{in}(t)$ = Indoor PM2.5 concentration ($\mu g/m^3$)
- $C_{out}(t)$ = Ambient outdoor PM2.5 concentration ($\mu g/m^3$)
- $P$ = Penetration factor (fraction of outdoor PM2.5 penetrating building envelope: $0.70$ for leaky, $0.55$ for average, $0.40$ for tight)
- $a$ = Air exchange rate ($ACH$, $h^{-1}$: $1.5$ for open windows, $0.8$ for mixed, $0.3$ for sealed)
- $k$ = Natural surface deposition rate ($0.2\ h^{-1}$)
- $CADR$ = Clean Air Delivery Rate of filtration ($m^3/h$)
- $V$ = Room volume ($m^3$)
- $S$ = Indoor generation source (e.g. unvented biomass or LPG cooking)

The analytical steady-state solution is:

$$C_{ss} = \frac{P \cdot a \cdot C_{out} + S / V}{a + k + CADR / V}$$

---

## 4. Allowlisted Patch Engine & Transparency

When the conversational assistant (`/api/assist`) recommends changing household habits or settings, it **cannot arbitrarily mutate user state**.

All profile mutations are constrained to an **immutable patch allowlist**:

- `set_commute_mode`
- `set_cooking_fuel`
- `set_purifier`
- `set_window_habit`
- `adopt_action`
- `drop_action`
- `add_reminder`
- `set_budget_band`

Every patch proposal generates a visible diff in the chat UI with **"Apply to Profile"** and **"Undo"** buttons, ensuring complete user autonomy and auditability.

---

## 5. Security & Privacy Architecture

- **Zero Secrets in Repository or Browser**: The Gemini API key is strictly bound to serverless environment variables (`GEMINI_API_KEY`).
- **Data Minimization**: No names, exact addresses, or diagnostic health records are collected. Coarse flags (e.g. `hasInfant`, `isAsthmatic`) and rounded coordinates ($\sim 1.1\text{ km}$ precision) are used solely for localized physics.
- **Strict Content Security Policy (CSP)**:
  - `default-src 'self'`
  - `connect-src 'self'` (Zero third-party trackers, fonts, or analytics)
  - `script-src 'self'` (No unsafe inline scripts or `eval`)
  - `frame-ancestors 'none'`
- **Prompt Injection Defense**: User queries sent to `/api/assist` are wrapped in strict XML tags (`<user_message>...</user_message>`) with all brackets escaped, preventing instructions from hijacking system instructions.
- **Safe DOM APIs**: All views construct elements programmatically or assign via `.textContent`. **Zero user or model-supplied text is ever assigned via `.innerHTML`**.

---

## 6. Zero-Framework Frontend & Performance

- **Zero Bundle Step**: Native ES Modules (`<script type="module">`), pure vanilla JavaScript, and modern semantic CSS variables.
- **Zero Third-Party Chart Libraries**: All hourly strip charts, range bands, and before/after comparisons are generated as lightweight, inline semantic SVGs with accompanying data tables.
- **Lightweight Footprint**: Entire Git repository is $< 200\text{ KB}$, loads instantly on 3G connections, and works completely offline once cached.
