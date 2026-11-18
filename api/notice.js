/**
 * @fileoverview POST /api/notice
 * Drafts community clean-air circulars across WhatsApp, Email, and Notice-Board formats.
 */

import { z } from "zod";
import { sendJson } from "./_lib/security.js";
import { createHandler } from "./_lib/handler.js";
import { generateGroundedContent } from "./_lib/gemini.js";
import { getCommunityChecklist, createBaselineNotice } from "../web/js/engine/community.js";

const NoticeSchema = z.object({
  communityType: z.enum(["rwa", "school", "mohalla"]),
  category: z.enum(["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"]),
  language: z.enum(["en", "hi", "hinglish"]).default("en"),
  customNotes: z.string().max(200).optional(),
});

/**
 * Prompts Gemini to draft formatted multilingual community circulars.
 * @param {string} type
 * @param {string} category
 * @param {Array<{ id: string, text: string }>} checklist
 * @param {string} language
 * @returns {Promise<{ whatsapp: string, email: string, noticeBoard: string } | null>}
 */
async function draftAiNotice(type, category, checklist, language) {
  const items = checklist.map((i) => i.text).join("; ");
  const prompt = `Draft community clean-air circulars in ${language}.
Community: ${type.toUpperCase()}, Air Category: ${category}
Checklist items: ${items}

Return JSON with exact keys:
{
  "whatsapp": "formatted WhatsApp text with bold headers and emojis",
  "email": "Subject and body of email circular",
  "noticeBoard": "one-line high-impact capitalized headline"
}`;

  const jsonStr = await generateGroundedContent({
    prompt,
    systemInstruction: "You are a professional community circular author for clean air.",
    maxTokens: 512,
    jsonMode: true,
  });

  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Serverless handler for POST /api/notice.
 */
export default createHandler({
  methods: ["POST"],
  schema: NoticeSchema,
  schemaErrorMessage: "Validation failed for notice input",
  run: async ({ res, data }) => {
    const checklist = getCommunityChecklist(data.communityType, data.category);
    const baselineNotice = createBaselineNotice(data.communityType, data.category, checklist);

    const aiNotice = await draftAiNotice(
      data.communityType,
      data.category,
      checklist,
      data.language
    );

    return sendJson(res, 200, aiNotice || baselineNotice, { "Cache-Control": "no-store" });
  },
});
