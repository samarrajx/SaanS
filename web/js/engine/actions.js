/**
 * @fileoverview Curated action catalog for routines, indoor hacks, and sustainable swaps.
 * Pure definitions with applicability predicates and verified evidence tiers.
 */

/**
 * Checks if HEPA purifier action is applicable to household profile.
 * @param {import("../types.js").HouseholdProfile} p
 * @returns {boolean}
 */
function isHepaPurifierApplicable(p) {
  const home = p?.home;
  if (home?.purifier?.has) return true;
  const band = p?.lifestyle?.budgetBand;
  return band === "medium" || band === "high";
}

/**
 * Action catalog definitions.
 * @type {Array<import("../types.js").ActionDefinition & { costNumeric: number, title: string, description: string }>}
 */
export const ACTIONS_CATALOG = [
  // ROUTINE ACTIONS
  {
    id: "shift_exercise_hours",
    group: "routine",
    title: "Shift outdoor workout to afternoon clean window",
    description:
      "Avoid morning and evening winter smog peaks; exercise between 12:00 and 15:00 or indoors.",
    costBand: "₹0",
    costNumeric: 0,
    effort: "low",
    evidenceTier: "established",
    sourceCitation: "CPCB / WHO Air Quality Guidelines (2021)",
    isApplicable: () => true,
  },
  {
    id: "wear_n95_mask",
    group: "routine",
    title: "Wear certified N95 / FFP2 mask during transit",
    description: "Filters ≥95% of fine particulates during outdoor commute and street errands.",
    costBand: "₹",
    costNumeric: 150,
    effort: "low",
    evidenceTier: "established",
    sourceCitation: "NIOSH / CDC Guidance on Particulate Respirators",
    isApplicable: () => true,
  },
  {
    id: "timed_ventilation",
    group: "routine",
    title: "Seal windows except 15-min afternoon flush",
    description:
      "Keep drafty windows shut during nighttime and morning inversion; air flush briefly around 13:00.",
    costBand: "₹0",
    costNumeric: 0,
    effort: "low",
    evidenceTier: "model_estimate",
    sourceCitation: "Indoor Mass-Balance Model (Saans Engine)",
    isApplicable: (p) => p?.home?.windowsUsually !== "closed",
  },
  {
    id: "stagger_school_drop",
    group: "routine",
    title: "Mask and stagger morning school run",
    description:
      "Equip children with N95 masks for early morning transit; shift to closed-cabin transport.",
    costBand: "₹0",
    costNumeric: 0,
    effort: "low",
    evidenceTier: "established",
    sourceCitation: "Indian Academy of Pediatrics (IAP) Smog Advisory",
    isApplicable: (p) =>
      Boolean(
        p?.household?.members?.some((m) => m.ageGroup === "child" || m.ageGroup === "infant")
      ),
  },

  // INDOOR AIR HACKS
  {
    id: "diy_box_fan_filter",
    group: "indoor",
    title: "DIY box fan air cleaner (Corsi-Rosenthal)",
    description:
      "Affordable room filtration using a standard box/pedestal fan and MERV13 / HEPA sheet.",
    costBand: "₹",
    costNumeric: 800,
    effort: "medium",
    evidenceTier: "established",
    sourceCitation: "Ford et al. (2022), EPA Air Cleaner Evaluation",
    isApplicable: (p) => !p?.home?.purifier?.has,
  },
  {
    id: "hepa_purifier_run",
    group: "indoor",
    title: "Continuous HEPA room air purifier",
    description: "Operate a certified HEPA air purifier in the primary bedroom / living zone.",
    costBand: "₹₹",
    costNumeric: 5000,
    effort: "low",
    evidenceTier: "established",
    sourceCitation: "AHAM AC-1 / EPA Residential Air Cleaners",
    isApplicable: (p) => isHepaPurifierApplicable(p),
  },
  {
    id: "weatherstrip_windows",
    group: "indoor",
    title: "Weather-strip door and window gaps",
    description:
      "Apply self-adhesive foam tape and door sweeps to cut outdoor particulate infiltration by 40-50%.",
    costBand: "₹",
    costNumeric: 350,
    effort: "medium",
    evidenceTier: "established",
    sourceCitation: "Chen & Zhao (2011), Atmos. Environ.",
    isApplicable: (p) => p?.home?.tightness === "leaky" || p?.home?.tightness === "average",
  },
  {
    id: "stop_agarbatti_coils",
    group: "indoor",
    title: "Replace agarbatti and mosquito coils",
    description:
      "Switch to electric diffusers or liquid vaporizers to eliminate heavy indoor PM emissions.",
    costBand: "₹0",
    costNumeric: 0,
    effort: "low",
    evidenceTier: "established",
    sourceCitation: "Lin et al. (2008) / Liu et al. (2003)",
    isApplicable: () => true,
  },
  {
    id: "wet_mopping_only",
    group: "indoor",
    title: "Wet mopping (pochha) instead of dry sweeping",
    description:
      "Dry sweeping resuspends fine settled dust; damp mopping traps particles on surfaces.",
    costBand: "₹0",
    costNumeric: 0,
    effort: "low",
    evidenceTier: "established",
    sourceCitation: "WHO Household Air Quality Guidelines (2014)",
    isApplicable: () => true,
  },

  // COMMUTE SWAPS
  {
    id: "switch_metro_bus",
    group: "commute",
    title: "Switch solo driving to Metro or AC electric bus",
    description: "Cuts personal commute exposure by 40% and avoids ~0.15 kg CO₂e per passenger-km.",
    costBand: "₹",
    costNumeric: 60,
    effort: "medium",
    evidenceTier: "established",
    sourceCitation: "CPCB / ARAI Emission Database; DMRC Sustainability Report",
    isApplicable: (p) =>
      Boolean(p?.lifestyle?.commute?.some((c) => c.mode === "car" || c.mode === "two_wheeler")),
  },
  {
    id: "wfh_smog_alert",
    group: "commute",
    title: "Work from home on Severe smog days",
    description: "Eliminates peak outdoor transit exposure during inversion hours.",
    costBand: "₹0",
    costNumeric: 0,
    effort: "low",
    evidenceTier: "established",
    sourceCitation: "Commission for Air Quality Management (CAQM) Advisory",
    isApplicable: (p) => Boolean(p?.lifestyle?.commute?.length && p.lifestyle.commute.length > 0),
  },

  // COOKING & HEATING
  {
    id: "switch_induction_stove",
    group: "cooking",
    title: "Cook on electric induction instead of chulha or gas",
    description:
      "Eliminates combustion emissions in the kitchen; reduces indoor PM2.5 by up to 70%.",
    costBand: "₹₹",
    costNumeric: 2500,
    effort: "medium",
    evidenceTier: "established",
    sourceCitation: "Balakrishnan et al. (2013), Lancet Global Health",
    isApplicable: (p) => p?.home?.cookingFuel === "biomass" || p?.home?.cookingFuel === "lpg",
  },
  {
    id: "replace_biomass_heating",
    group: "heating",
    title: "Electric oil radiator or thermal blankets for warmth",
    description: "Replace smoky wood or coal sigri heating with zero-combustion electric heat.",
    costBand: "₹₹",
    costNumeric: 3000,
    effort: "medium",
    evidenceTier: "established",
    sourceCitation: "CPCB Urban Winter Action Plan",
    isApplicable: (p) => p?.home?.heating === "biomass" || p?.home?.heating === "coal",
  },

  // WASTE & COMMUNITY
  {
    id: "stop_leaf_burning",
    group: "waste",
    title: "Compost garden sweepings and leaf waste",
    description:
      "Open biomass burning emits lethal polycyclic aromatic hydrocarbons and PM2.5 right at ground level.",
    costBand: "₹0",
    costNumeric: 0,
    effort: "low",
    evidenceTier: "established",
    sourceCitation: "CPCB Solid Waste Management Rules",
    isApplicable: () => true,
  },
  {
    id: "community_night_heaters",
    group: "community",
    title: "Equip RWA / society guards with electric heaters",
    description:
      "Prevents overnight security staff from burning scrap plastics and wood for survival warmth.",
    costBand: "₹₹",
    costNumeric: 2000,
    effort: "medium",
    evidenceTier: "established",
    sourceCitation: "CAQM Graded Response Action Plan (GRAP)",
    isApplicable: () => true,
  },
];
