/**
 * @fileoverview Community Checklists and AQI-triggered Action Tiers.
 * Data templates for Resident Welfare Associations (RWAs), schools, and mohallas.
 */

/**
 * Community templates and action tiers by AQI severity.
 */
export const COMMUNITY_TEMPLATES = {
  rwa: {
    id: "rwa",
    name: "Resident Welfare Association (RWA)",
    description: "Apartment societies, housing colonies, and gated complexes.",
    tiers: {
      Poor: [
        {
          id: "rwa_p1",
          text: "Prohibit all open burning of leaves, pruning waste, and trash in society grounds.",
        },
        {
          id: "rwa_p2",
          text: "Inspect diesel generator filters and limit non-essential generator testing.",
        },
      ],
      "Very Poor": [
        {
          id: "rwa_vp1",
          text: "Provide electric heaters and shelter for night security guards (ban coal/wood bonfires).",
        },
        {
          id: "rwa_vp2",
          text: "Enforce wet-covering and sprinkling over society renovation/construction debris.",
        },
        {
          id: "rwa_vp3",
          text: "Circulate resident advisory: keep windows shut during morning smog inversion.",
        },
      ],
      Severe: [
        {
          id: "rwa_s1",
          text: "Set up a HEPA-filtered clean air refuge zone in the community clubhouse for elders.",
        },
        {
          id: "rwa_s2",
          text: "Halt all outdoor landscaping leaf blowers and dry sweeping on internal roads.",
        },
        {
          id: "rwa_s3",
          text: "Distribute certified N95 masks to estate housekeeping and security personnel.",
        },
      ],
    },
  },

  school: {
    id: "school",
    name: "Schools & Educational Institutions",
    description: "Primary, secondary schools, daycares, and playgroups.",
    tiers: {
      Poor: [
        {
          id: "sch_p1",
          text: "Move high-exertion outdoor athletic activities to indoor sports hall.",
        },
        {
          id: "sch_p2",
          text: "Instruct bus drivers and conductors to avoid vehicle idling near gates.",
        },
      ],
      "Very Poor": [
        {
          id: "sch_vp1",
          text: "Suspend morning open-air assemblies; conduct briefings inside classrooms.",
        },
        {
          id: "sch_vp2",
          text: "Permit indoor recess and library hours instead of outdoor playground.",
        },
        {
          id: "sch_vp3",
          text: "Require N95 / FFP2 masks during school van and open auto transit.",
        },
      ],
      Severe: [
        {
          id: "sch_s1",
          text: "Activate hybrid online schooling option for primary and junior sections.",
        },
        {
          id: "sch_s2",
          text: "Seal classroom window drafts and operate room air cleaners in infirmary.",
        },
        {
          id: "sch_s3",
          text: "Suspend all outdoor sports, marches, and after-school sports coaching.",
        },
      ],
    },
  },

  mohalla: {
    id: "mohalla",
    name: "Mohalla / Ward / Neighborhood",
    description: "Local streets, market associations, and community groups.",
    tiers: {
      Poor: [
        {
          id: "moh_p1",
          text: "Coordinate with municipal sanitation staff for prompt leaf composting.",
        },
        {
          id: "moh_p2",
          text: "Encourage local shops to use electric heating rather than burning scrap cardboard.",
        },
      ],
      "Very Poor": [
        {
          id: "moh_vp1",
          text: "Deploy daily water sprinkling on unpaved street shoulders to suppress dust.",
        },
        {
          id: "moh_vp2",
          text: "Set up a neighborhood WhatsApp air alert group for elderly check-ins.",
        },
      ],
      Severe: [
        {
          id: "moh_s1",
          text: "Distribute community-funded N95 masks to street vendors and daily wage laborers.",
        },
        {
          id: "moh_s2",
          text: "Report illegal municipal garbage fires instantly on the Sameer / 311 app.",
        },
      ],
    },
  },
};

/**
 * Returns the relevant checklist items for a given community type and AQI category.
 *
 * @param {"rwa" | "school" | "mohalla"} type
 * @param {import("../types.js").AQICategory} category
 * @returns {Array<{ id: string, text: string }>}
 */
export function getCommunityChecklist(type, category) {
  const template = COMMUNITY_TEMPLATES[type] || COMMUNITY_TEMPLATES.rwa;
  const tiers = /** @type {Record<string, Array<{ id: string, text: string }>>} */ (template.tiers);
  const directItems = tiers[category] || [];

  // When Severe, include cumulative items from Very Poor as well
  if (category === "Severe" && tiers["Very Poor"]) {
    return [...tiers["Very Poor"], ...directItems];
  }
  return directItems;
}

/**
 * Creates deterministic baseline community notices across 3 channels.
 *
 * @param {"rwa" | "school" | "mohalla"} type
 * @param {import("../types.js").AQICategory} category
 * @param {Array<{ id: string, text: string }>} checklist
 * @returns {{ whatsapp: string, email: string, noticeBoard: string }}
 */
export function createBaselineNotice(type, category, checklist) {
  const template = COMMUNITY_TEMPLATES[type] || COMMUNITY_TEMPLATES.rwa;
  const items = checklist
    .slice(0, 3)
    .map((item) => `• ${item.text}`)
    .join("\n");

  const whatsapp = `🚨 *Air Quality Alert: ${category} AQI*\nDear ${template.name} Members,\nAir pollution has reached ${category} levels. Immediate actions:\n${items}\nPlease keep windows closed during morning hours and avoid open waste burning.`;

  const email = `Subject: Important Advisory: Air Quality Reaches ${category} Category\n\nDear Members,\n\nIn light of the severe winter inversion and air quality reaching the ${category} category, we urge all residents and staff to adhere to the following clean-air guidelines:\n\n${items}\n\nLet us collaborate to safeguard vulnerable elders and children.\n\nWarm regards,\nManagement Committee`;

  const noticeBoard = `AIR ALERT (${category.toUpperCase()} AQI): NO OPEN BURNING. SEAL WINDOWS. WEAR N95 MASKS OUTDOORS.`;

  return { whatsapp, email, noticeBoard };
}
