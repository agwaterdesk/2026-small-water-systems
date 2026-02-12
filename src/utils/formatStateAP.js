/**
 * AP Style state abbreviations.
 * Eight states are never abbreviated: Alaska, Hawaii, Idaho, Iowa, Maine, Ohio, Texas, Utah.
 * @see https://www.apstylebook.com/
 */
const AP_STATE = {
  AL: "Ala.",
  AZ: "Ariz.",
  AR: "Ark.",
  CA: "Calif.",
  CO: "Colo.",
  CT: "Conn.",
  DE: "Del.",
  FL: "Fla.",
  GA: "Ga.",
  IL: "Ill.",
  IN: "Ind.",
  KS: "Kan.",
  KY: "Ky.",
  LA: "La.",
  MD: "Md.",
  MA: "Mass.",
  MI: "Mich.",
  MN: "Minn.",
  MS: "Miss.",
  MO: "Mo.",
  MT: "Mont.",
  NE: "Neb.",
  NV: "Nev.",
  NH: "N.H.",
  NJ: "N.J.",
  NM: "N.M.",
  NY: "N.Y.",
  NC: "N.C.",
  ND: "N.D.",
  OK: "Okla.",
  OR: "Ore.",
  PA: "Pa.",
  RI: "R.I.",
  SC: "S.C.",
  SD: "S.D.",
  TN: "Tenn.",
  VT: "Vt.",
  VA: "Va.",
  WA: "Wash.",
  WV: "W.Va.",
  WI: "Wis.",
  WY: "Wyo.",
  DC: "D.C.",
  AK: "Alaska",
  HI: "Hawaii",
  ID: "Idaho",
  IA: "Iowa",
  ME: "Maine",
  OH: "Ohio",
  TX: "Texas",
  UT: "Utah",
};

/**
 * Returns the AP Style version of a state name given its postal abbreviation.
 *
 * @param {string} stusps - 2-letter postal/state abbreviation (e.g. "AL", "LA", "TX")
 * @returns {string} AP Style state name (e.g. "Ala.", "La.", "Texas")
 */
export default function formatStateAP(stusps) {
  if (!stusps) return "";
  const key = String(stusps).toUpperCase().trim();
  return AP_STATE[key] ?? key;
}
