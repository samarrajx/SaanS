# PLAN.md — Saans: AI Clean-Air Assistant for Families & Communities

Working name: **Saans** (breath). Rename in one constant.
Challenge: _GenAI assistant that helps families and communities navigate severe winter smog and urban air pollution: low-emission daily routines, indoor air quality hacks and sustainable alternatives, tailored to location and lifestyle, clearly explaining the direct impact of their choices._

This file is the single source of truth. Antigravity: follow it phase by phase and do not add features that are not listed.

---

## 0. Hard rules

- Public GitHub repo, **one branch only (`main`)**, size **< 10 MB**. No secrets in the repo or git history.
- Deploy on **Vercel only** (static `web/` plus serverless `api/`), auto-deployed from `main`.
- Commit and push after every phase.
- Scored on: Code Quality, Security, Efficiency, Testing, Accessibility, Problem Statement Alignment. The previous project scored lowest on Code Quality, so the quality rules in section 1 are **mandatory from the first commit**.

## 1. Quality rules (enforced by tooling, not by good intentions)

- **Functions: max 40 lines** (ESLint `max-lines-per-function` as an error at 50, warning at 40). **Files: max 250 lines.** `complexity` max 10.
- **TypeScript checking from day one:** `tsconfig.json` with `allowJs`, `checkJs`, **`strict: true`**, covering **all** of `web/js` and `api` (not just the engine). Shared JSDoc typedefs live in `web/js/types.js`.
- **Prettier** with a CI format check. ESLint with `eqeqeq`, `prefer-const`, no unused vars.
- **No repeated UI code:** one shared primitives module (`web/js/ui/`): `form-field`, `inline-form`, `card`, `chip`, `tabs`, `modal`, `chart-line`, `chart-bars`, `data-table`, `announcer`. Views compose these; they never rebuild them.
- One concern per file; views are folders of small modules. No facade files that only re-export.
- Named constants for every number (limits, timeouts, thresholds); each with a one-line comment.
- CI (Node **22**, README must say Node ≥ 22): format check, lint, typecheck, tests with coverage, `npm audit`.
- **README numbers come only from `npm run report`** (a script that prints the test count and the coverage using `node --test --experimental-test-coverage --test-coverage-exclude="tests/**"`). Never type a figure by hand. Every README claim (limits, tool names, headers, thresholds) must match the code; review this in phase 9.

## 2. Product summary

Saans turns **local air-quality data** plus a **household profile** into three things: a **day plan**, a **home air plan** and a set of **swaps**, each with a visible **impact estimate** and the assumptions behind it.

**Principle: the model judges and explains; code calculates.** Gemini never invents AQI values, schedules or impact numbers. It calls deterministic tools and writes the personalised narrative in English, Hindi or Hinglish.

How the prompt maps to features:

| Requirement                 | Feature                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Families                    | Household profile: members by age group plus a generic "sensitive" flag (no diagnoses), home type, cooking fuel, heating, commute, purifier |
| Communities                 | Community mode: RWA / school / mohalla checklists with AQI-triggered action tiers and an AI notice drafter                                  |
| Tailored to location        | City search or GPS, hourly forecast, India's CPCB AQI categories                                                                            |
| Low-emission daily routines | Hour-by-hour day plan: best outdoor windows, ventilation windows, school-run and exercise timing, cooking and commute adjustments           |
| Indoor air hacks            | Home Air Lab: ranked by estimated reduction per ₹, with a before/after indoor PM2.5 simulation                                              |
| Sustainable alternatives    | Swaps for commute, cooking, heating, waste burning and crackers                                                                             |
| Explain the direct impact   | **Impact ledger** and a "Why this?" panel on every suggestion: estimated change, range, assumptions, confidence                             |

Out of scope: accounts, a database, push notifications, payments, photo upload, medical advice, diagnosing symptoms.

## 3. Architecture

```
Vercel (one project, one origin)                                             External
 web/  static frontend (vanilla ES modules, no framework, no build step)
   │  fetch('/api/...')
 api/  serverless functions ───▶ Open-Meteo Air Quality API (PM2.5, PM10 forecast)
   │                         ───▶ Open-Meteo Geocoding API (city search)
   └──────────────────────────▶ Gemini (@google/genai): function calling + JSON output
```

- Pure engine in `web/js/engine/` (no DOM, no network), imported by both browser and API: one implementation of the logic.
- The browser calls only `/api/*` (**CSP `connect-src 'self'`**).
- Gemini model comes from env `GEMINI_MODEL` (a fast Flash-Lite-class model). Verify the exact current model name in Google's docs; do not guess.
- `vercel.json`: `outputDirectory: "web"`, no build command, `maxDuration` per function, security headers, cache headers (below).

### Data sources (verified Nov 2026 unless marked)

**Open-Meteo Air Quality API**

- Endpoint `https://air-quality-api.open-meteo.com/v1/air-quality` with `latitude`, `longitude`, `hourly=pm2_5,pm10`, `timezone`, `forecast_days` (0 to 7, default 5), optional `past_days` (0 to 92). Values are µg/m³ at about 10 m above ground.
- Outside Europe the data comes from the **CAMS global forecast**, which is coarse (roughly 0.25° to 0.4°, about 25 to 45 km) and 3-hourly (hourly values are interpolated). It is a **model estimate for the area, not a street-level or monitor reading.** The UI and README must say this and suggest comparing with the nearest official CPCB or state monitor.
- Terms: free for **non-commercial** use under 10,000 calls/day, 5,000/hour, 600/min; no uptime guarantee; data is **CC BY 4.0, attribution required** (credit "CAMS ENSEMBLE data provider" and Open-Meteo). Show the attribution in Settings, on the Today screen footer and in the README.
- Geocoding: Open-Meteo Geocoding API (`https://geocoding-api.open-meteo.com/v1/search?name=...&count=5`); verify the parameters when implementing.

**CPCB National AQI (NAQI)**

- Classes: Good 0–50, Satisfactory 51–100, Moderate 101–200, Poor 201–300, Very Poor 301–400, Severe 401–500.
- PM2.5 (24-h, µg/m³) breakpoints **verified** against the CPCB table: Good 0–30, Satisfactory 31–60, Moderate 61–90. PM10 (24-h): Good 0–50, Satisfactory 51–100, Moderate 101–250.
- **To verify against the official CPCB NAQI document and then cite in the code comment:** PM2.5 Poor 91–120, Very Poor 121–250, Severe 250+; PM10 Poor 251–350, Very Poor 351–430, Severe 430+.
- Sub-index by linear interpolation inside the breakpoint band; overall AQI is the maximum sub-index. We only have PM2.5 and PM10, so label the result **"PM-based NAQI estimate"**, never "official AQI".
- Official PM categories use 24-hour averages. Use a **rolling 24-hour mean** for the headline category and show **hourly values separately** as "hourly estimate".

## 4. Engine (pure functions, golden-tested) — `web/js/engine/`

| Module                  | Responsibility                                                                                                                                                                                                                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `breakpoints.js`        | CPCB tables as data, with a source comment per row                                                                                                                                                                                                                                                                                       |
| `naqi.js`               | Sub-index, category, dominant pollutant, rolling 24-h mean, hourly series classification                                                                                                                                                                                                                                                 |
| `exposure.js`           | From the hourly series and profile sensitivity: peak hours, best outdoor windows, ventilation windows (lowest outdoor PM), stricter thresholds when sensitive members exist                                                                                                                                                              |
| `assumptions.js`        | Every model parameter with low / central / high values, units, and a `source` field. **Never invent a citation.** If a value cannot be sourced, mark it `typical range (assumption)` and show it that way in the UI.                                                                                                                     |
| `indoor.js`             | Indoor PM2.5 mass-balance model: `dC/dt = P·λ·C_out + S/V − (λ + k + CADR/V)·C`, solved hourly. Inputs: infiltration λ by home tightness and window state, deposition k, purifier CADR and room volume V, indoor sources S (cooking, incense, mosquito coil). Returns an hourly indoor series for a baseline and for any set of actions. |
| `actions.js`            | Curated catalog: id, group (`routine`, `indoor`, `commute`, `cooking`, `heating`, `waste`, `community`), cost band (₹0 / ₹ / ₹₹ / ₹₹₹), effort, applicability predicate over the profile, effect model, evidence tier                                                                                                                    |
| `rank.js`               | Ranks applicable actions by estimated exposure reduction per ₹ under the user's budget band; deterministic and stable                                                                                                                                                                                                                    |
| `impact.js`             | `estimateImpact(action, profile, air)` → `{ exposureChange: {low, central, high, unit}, emissionsChange?, assumptions[], confidence }`. **Emission factors (CO₂e, PM) must be sourced from authoritative references found during the build.** If a factor cannot be verified, omit the number and show direction only ("lower").         |
| `schedule.js`           | Builds the day timeline from air hours plus profile constraints (school times, commute window, exercise, cooking times); each block references an action id                                                                                                                                                                              |
| `community.js`          | Checklist templates and AQI-triggered tiers for RWA, school and mohalla (e.g. what changes at Poor, Very Poor, Severe), as data                                                                                                                                                                                                          |
| `baseline.js`           | Complete rule-based plan with no AI (used when Gemini fails and in demo mode)                                                                                                                                                                                                                                                            |
| `scenarios.js`          | Synthetic winter-inversion diurnal curves for a chosen category, labelled **"Simulated"**, for demos and tests                                                                                                                                                                                                                           |
| `patch.js`              | Allowlisted profile/plan changes, applied immutably, with a human-readable diff                                                                                                                                                                                                                                                          |
| `ics.js`                | `.ics` reminders for key windows (close windows, mask up, best time to walk)                                                                                                                                                                                                                                                             |
| `money.js`, `format.js` | Rupee formatting (lakh grouping), number and range formatting, units                                                                                                                                                                                                                                                                     |

**Impact rules (honesty is scored):** every number is an estimate, always shown as a **range** with assumptions and a confidence label (High / Medium / Low). Do not present false precision or invented statistics. Add a visible note: _"Estimates for planning, not medical advice."_ A "cigarette equivalent" style heuristic is **not** used.

### Profile model (browser `localStorage` only, versioned)

```
profile {
  schemaVersion, language: en|hi|hinglish, units,
  location { name, lat, lon, timezone },
  household { members: [{ id, label, ageGroup: infant|child|adult|senior, sensitive: boolean }] },
  home { type: flat|house, tightness: leaky|average|tight, windowsUsually: open|mixed|closed,
         cookingFuel: lpg|induction|biomass|other, heating: none|electric|biomass|coal|other,
         purifier: { has: boolean, cadrM3h?: number }, roomVolumeM3?: number },
  lifestyle { commute: [{ memberId, mode, distanceKm, daysPerWeek }], vehicles[], budgetBand: zero|low|medium|high,
              schoolStart?, workStart?, exercisePreference?, },
  adoptedActions: [{ actionId, since }], reminders[], loggedWins[]
}
```

No names, no diagnoses. Wrap every storage read and write in try/catch, validate on load, migrate by `schemaVersion`, and survive corrupt or full storage. Debounce writes (300 ms) and flush on `pagehide` / `visibilitychange`. Provide "Delete all my data".

## 5. API — `api/`

Shared rules: JSON only (`GET` for air and geocode, `POST` for the rest), 32 KB body cap, strict Zod schemas (unknown keys rejected), validated model output, generic error messages, per-IP rate limit, **exact-host `Origin` check** (own host, `localhost`, `127.0.0.1` compared exactly after parsing; no suffix matching), no logging of coordinates or user text.

| Endpoint               | Purpose                                                                                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/air?lat&lon` | Validates lat/lon, **rounds coordinates to 2 decimals**, fetches from Open-Meteo (fixed host, whitelisted params only), normalises to `{ times[], pm25[], pm10[], meta: { model, resolutionNote, fetchedAt, attribution } }`, caches per rounded cell (60 min TTL)   |
| `GET /api/geocode?q`   | Query length 2 to 80, fixed host, `count=5`, cached 24 h (LRU), returns `{ name, admin, country, lat, lon, timezone }[]`                                                                                                                                             |
| `POST /api/plan`       | Body: location, coarse profile flags, language. Server fetches air data itself (never trusts client-sent air data), runs engine tools, Gemini writes the narrative. Returns day plan, ranked actions with impact objects, and a short "today in plain words" summary |
| `POST /api/assist`     | Chat reply plus optional patch (allowlisted ops). Grounded in the same server-fetched air data                                                                                                                                                                       |
| `POST /api/notice`     | Drafts a community notice (RWA, school, neighbours, employer) in the chosen language; channels: WhatsApp text, email, notice-board one-liner                                                                                                                         |
| `GET /api/ping`        | Health check                                                                                                                                                                                                                                                         |

**Tool loop** (server side, max 4 iterations, hard timeout): Gemini may call `get_air_summary`, `rank_actions`, `estimate_impact`, `schedule_day`. Each is a thin wrapper over the engine. If the SDK cannot combine function calling with a response schema, run the tool phase first and then a final structured call. If tool calling fails entirely, the engine computes first and the model receives the results as grounded facts.

**Model call rules:** `maxOutputTokens` per endpoint (plan 2048, assist 1024, notice 768; tune against real output); pass a JSON schema to the API if supported and keep Zod as the final gate; timeout per call; one retry on transient errors only; user text only as JSON data inside tagged blocks, with an instruction to treat it as data. Output language follows `language`; JSON keys and enums stay in English. Responses for `air`/`geocode` carry `Cache-Control` suitable for short caching; `plan`/`assist`/`notice` use `no-store`.

**Patch allowlist:** `set_commute_mode`, `set_cooking_fuel`, `set_purifier`, `set_window_habit`, `adopt_action`, `drop_action`, `add_reminder`, `set_budget_band`. Anything else is rejected. The patch never changes location or deletes data.

## 6. Screens and UX (mobile-first)

**Look:** calm, trustworthy, warm. Clean light theme (dark theme only if time remains), soft rounded cards, a readable humanist or system font stack (self-host at most one subsetted `woff2`; **no third-party font or image requests**). Hero uses CSS gradient plus inline SVG, no stock photos.

**AQI colours** follow the six CPCB categories but are **never the only signal**: each category also has an icon, a text label and a pattern or shape. All pairs meet WCAG AA (4.5:1 text, 3:1 UI). Mobile: bottom navigation; desktop: sidebar.

1. **Onboarding (about 60 seconds):** location (search or GPS, coarse) → household → home and lifestyle. A **"Try the demo"** button loads Patna with a _simulated_ Severe scenario (clearly labelled). Defaults make every step skippable.
2. **Today:** headline PM-based NAQI category (24-h mean) with dominant pollutant; hourly strip chart (inline SVG) with a **table toggle**; "Do these 3 things today" with impact chips; data caveat and attribution footer.
3. **Day Plan:** timeline of blocks (go out, ventilate, cook, commute, school run, exercise, close up) each with a short reason and a link to its action; `.ics` export for reminders.
4. **Home Air Lab:** ranked indoor actions with cost band and effect; toggle actions to see the **before/after indoor PM2.5 chart** (range band, accessible table); DIY options flagged for ₹0 / ₹ budgets.
5. **Swaps:** commute, cooking, heating, waste burning, crackers; each shows effort, cost, and effect; running **impact ledger** ("estimated exposure avoided this week", range; emissions direction or sourced figure).
6. **Community:** choose RWA / school / mohalla; checklist with AQI-triggered tiers (what to do at Poor / Very Poor / Severe); **Draft notice** (AI); print-friendly one-pager.
7. **Ask:** assistant chat with 4 suggested prompts; replies cite today's data; proposed patches shown as a diff with Apply / Undo.
8. **Settings & About:** language (English / Hindi / Hinglish), units, location, data sources and attribution (CAMS ENSEMBLE data provider, Open-Meteo, CC BY 4.0), disclaimer, privacy ("your profile never leaves this device except coarse flags needed for a plan"), delete my data.

**"Why this?" panel** on every suggestion: what it does, estimated impact with low / central / high, assumptions, confidence, evidence type (established guidance vs model estimate).

**Safety copy:** the app gives general guidance, not medical advice. For breathing difficulty, chest pain or other symptoms, tell the user to seek medical care. No symptom diagnosis.

**Languages:** UI strings in `web/js/locales/{en,hi,hinglish}.js`; a test fails if any key is missing from any locale. Samar reviews the Hindi strings before submission.

## 7. Accessibility (from the first screen)

Semantic landmarks, skip link, one `h1` per view, every control labelled, visible focus rings, logical tab order; tab/nav patterns with arrow-key support; `aria-live` announcer for plan loading, patch applied and errors; charts always have a table equivalent and a text summary; colour never the only signal; `prefers-reduced-motion`; touch targets of at least 44 px; works at 320 px and 200% zoom; print stylesheet for the community one-pager and day plan; language attribute updates with the chosen language. Add static DOM-level tests (labels, landmarks, headings, alt text) using the mock DOM helper.

## 8. Security

- Gemini key only in Vercel env vars; never in the repo, browser, logs or errors.
- Strict Zod input schemas; lat in [-90, 90], lon in [-180, 180], rounded; enums allowlisted; text length-capped with control characters stripped.
- **SSRF-safe proxies:** fixed upstream hosts, whitelisted query parameters, timeouts, response size caps and schema validation of upstream JSON.
- Model output validated before use; off-schema returns 502.
- Prompt-injection defence plus a hostile-input test.
- Rendering with `textContent` / safe DOM APIs only; **never `innerHTML` with user or model text**.
- Headers in `vercel.json`: CSP (`default-src 'self'`, `connect-src 'self'`, `frame-ancestors 'none'`, no inline scripts or styles), HSTS, `nosniff`, referrer policy, permissions policy (allow geolocation for self only), COOP, CORP.
- Data minimisation: the server never receives names or free-text health data, only coarse flags; coordinates are rounded and not logged.
- Per-IP rate limit (document that it is per serverless instance), exact-host `Origin` check, generic errors, `npm audit` in CI.

## 9. Efficiency

- No framework, no bundle step, inline SVG charts (no chart library).
- Server caches: air data per rounded cell (60 min), geocode (24 h LRU), with `X-Cache` header; token caps per endpoint.
- Engine recomputation is local and instant; the AI is called only on explicit actions (generate plan, ask, draft notice).
- Lazy-load rarely used modules with `import()` (community, notice modal, `.ics`, print view) plus `modulepreload` for entry modules.
- Static assets: `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` for `/css` and `/js`; `no-store` for `/api` write endpoints.
- Re-render only the changed panel; `AbortController` cancels stale requests; debounced storage writes.
- Record measured numbers (JS and CSS size, request count, cache behaviour) for the README Efficiency section.

## 10. Testing (`node --test`, no heavy framework)

- **Golden engine tests:** NAQI boundary values on both sides of every verified breakpoint; interpolation; rolling 24-h mean; dominant pollutant; window selection; indoor model sanity (purifier lowers indoor PM, tighter home lowers infiltration, steady state matches the closed-form value); ranking determinism; schedule respects school/commute constraints; baseline plan completeness for every profile combination class; patch allowlist and immutability; `.ics` validity; locale key completeness.
- **API tests with mocked upstreams and Gemini:** invalid lat/lon (400), foreign origin (403), wrong method (405), oversize (413), rate limit (429), upstream failure (502), timeout (504), cache hit/miss/expiry; Gemini success, malformed JSON, off-schema output, tool-loop stop, retry rules; prompt-injection input treated as data.
- **Frontend logic tests:** storage corruption recovery, migration, import validation, debounce flush, announcer, chart/table parity, onboarding flow, demo mode.
- Target at least 90% line coverage measured the way `npm run report` does it, and **report branch coverage honestly**.

## 11. Build phases (commit and push after each)

| #   | Deliverable                                                                                                                                               | Done when                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Skeleton: folders, `package.json`, strict TS config, ESLint limits, Prettier, CI (Node 22), `vercel.json` (headers, cache), `/api/ping`, `npm run report` | Empty page and `/api/ping` are live on Vercel; CI green                 |
| 2   | Engine A: `breakpoints`, `naqi`, `exposure`, `assumptions`, `indoor`, `scenarios` plus golden tests                                                       | All tests pass; NAQI boundaries verified against CPCB                   |
| 3   | Engine B: `actions`, `rank`, `impact`, `schedule`, `community`, `baseline`, `patch`, `ics`, `money`, `format` plus tests                                  | All tests pass; baseline plan works for every profile class             |
| 4   | API: `air`, `geocode`, Gemini client and tool loop, `plan`, `assist`, `notice`, security, caches                                                          | Handler and mocked-upstream tests pass; one real manual call each works |
| 5   | Frontend foundation: tokens, shell, router, storage, locales, UI primitives (`web/js/ui/`), settings                                                      | Layout matches the spec at 320 px and desktop; primitives tested        |
| 6   | Onboarding, Today, Day Plan, demo mode                                                                                                                    | Full flow works live and offline-fallback (API blocked)                 |
| 7   | Home Air Lab, Swaps, impact ledger, "Why this?" panels                                                                                                    | Before/after chart and table parity; ledger updates instantly           |
| 8   | Community, Ask (chat plus patch diff/apply/undo), exports (`.ics`, print, JSON backup/import)                                                             | Each covered by tests and announcer messages                            |
| 9   | Accessibility pass, performance pass, `docs/ARCHITECTURE.md`, README from `npm run report`, size check                                                    | Section 13 checklist fully green                                        |

## 12. README outline

1. Challenge and chosen approach, with the live URL at the top
2. What it does (screenshots: Today, Home Air Lab, Community)
3. Approach: "the model judges, code calculates"; architecture diagram
4. How it works: data flow, NAQI estimate, indoor model, impact estimates, tool loop, patches, fallback
5. **Data sources and attribution** (CAMS ENSEMBLE data provider, Open-Meteo, CPCB) and the **limits** (coarse model data, PM-only AQI estimate)
6. Assumptions (every parameter, with its source or "assumption")
7. Security; Accessibility; Efficiency (measured numbers); Testing (from `npm run report`)
8. Run locally (`vercel dev`) and deploy; env vars `GEMINI_API_KEY`, `GEMINI_MODEL`
9. Limitations, disclaimer (not medical advice), what I'd do next

## 13. Pre-submission checklist

- [ ] Public repo, one branch, under 10 MB, no secrets in history
- [ ] CI green: format, lint, typecheck (strict), tests, coverage, audit
- [ ] Every README claim and number matches the code and `npm run report`
- [ ] Live site tested with the real key, in English, Hindi and Hinglish
- [ ] "API blocked" test: baseline plan appears and is labelled
- [ ] Demo mode works; the simulated scenario is clearly labelled
- [ ] Keyboard-only and screen-reader pass; 320 px and 200% zoom checked
- [ ] Hostile-input tests pass (injection, oversize, bad origin, `localhost.evil.com`)
- [ ] Attribution shown in-app and in the README
- [ ] Deadline and submission form requirements checked before using an attempt

## 14. Manual setup (done by Samar)

1. Create the public repo with `main` as the default branch.
2. Get a Gemini API key from Google AI Studio.
3. Import the repo into Vercel; add `GEMINI_API_KEY` (sensitive) and `GEMINI_MODEL`.
4. Put the live Vercel URL at the top of the README.
5. Record a 2 to 3 minute demo video: onboarding in demo mode → Today → Day Plan → toggle a Home Air Lab action and show the before/after chart → Swaps ledger → draft a community notice → switch to Hindi.
