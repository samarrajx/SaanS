/**
 * @fileoverview RFC 5545 iCalendar (.ics) export generator.
 * Produces standards-compliant calendar reminders for key ventilation and exercise windows.
 */

/**
 * Formats a JavaScript Date object into an iCalendar UTC timestamp: YYYYMMDDTHHMMSSZ
 * @param {Date} date
 * @returns {string}
 */
export function formatIcsDate(date) {
  /** @param {number} n */
  const pad = (n) => n.toString().padStart(2, "0");
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Creates an event block for an iCalendar file.
 * @param {string} title
 * @param {string} description
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {string}
 */
function createIcsEvent(title, description, startDate, endDate) {
  const uid = `saans-${startDate.getTime()}-${Math.floor(Math.random() * 10000)}@saans.app`;
  const stamp = formatIcsDate(new Date());
  const start = formatIcsDate(startDate);
  const end = formatIcsDate(endDate);

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ].join("\r\n");
}

/**
 * Generates an .ics calendar file string from DayBlocks.
 *
 * @param {import("../types.js").DayBlock[]} blocks
 * @param {Date} [baseDate=new Date()]
 * @returns {string} RFC 5545 calendar string
 */
export function generateIcsCalendar(blocks, baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();

  const events = blocks.map((block) => {
    const [startH] = block.startHour.split(":").map((n) => parseInt(n, 10));
    const [endH] = block.endHour.split(":").map((n) => parseInt(n, 10));

    const startDate = new Date(year, month, day, startH, 0, 0);
    const endDate = new Date(year, month, day, endH, 0, 0);

    return createIcsEvent(`Saans: ${block.titleKey}`, block.reasonKey, startDate, endDate);
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Saans//Clean-Air Assistant//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
