import formatStateAP from "./formatStateAP.js";

/**
 * State FIPS (first 2 digits of GEOID) to county-equivalent suffix.
 * Uses Census Bureau conventions for county equivalents.
 */
const STATE_SUFFIX = {
  "02": "Borough", // Alaska (boroughs and census areas; Census areas often have "Census Area" in name)
  "22": "Parish",   // Louisiana
  "72": "Municipio", // Puerto Rico
};

const SUFFIXES = ["County", "Parish", "Borough", "Census Area", "Municipio", "Municipality"];

/**
 * Returns true if the name already ends with a known subdivision suffix.
 */
function hasSuffix(name) {
  const n = String(name || "").trim();
  return SUFFIXES.some((s) => n.endsWith(s));
}

/**
 * Formats a county/parish/borough name with the appropriate suffix and state (AP Style).
 *
 * @param {string} geoid - 5-digit FIPS GEOID (state + county)
 * @param {string} name - County/parish name (e.g. "Orleans", "Los Angeles")
 * @param {string} [stusps] - 2-letter state postal abbreviation (e.g. "LA") for AP Style suffix
 * @returns {string} e.g. "Orleans Parish, La." or "Los Angeles County, Calif."
 */
export default function formatCountyName(geoid, name, stusps) {
  const n = String(name ?? "").trim();
  if (!n) return "";

  const base = hasSuffix(n) ? n : `${n} ${STATE_SUFFIX[String(geoid ?? "").slice(0, 2)] ?? "County"}`;
  const state = formatStateAP(stusps);

  return state ? `${base}, ${state}` : base;
}
