import { feature } from "topojson-client";

/**
 * Fetches CWS (Community Water System) bounds for a county and converts to GeoJSON.
 * Files are served from public/cws/ (copied from src/data/cws at build time).
 *
 * @param {string} geoid - 5-digit county FIPS GEOID
 * @returns {Promise<GeoJSON.FeatureCollection|null>} GeoJSON or null if not found/failed
 */
export default async function fetchCwsBounds(geoid) {
  if (!geoid) return null;

  const base = import.meta.env.BASE_URL || "./";
  const url = `${base.replace(/\/$/, "")}/cws/county_systems_${geoid}.json`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const topology = await res.json();
    if (!topology?.objects) return null;

    const objectName = `temp_${geoid}`;
    const obj = topology.objects[objectName];
    if (!obj) return null;

    if (obj.type === "GeometryCollection") {
      const features = obj.geometries.map((geom) => {
        const temp = { ...topology, objects: { temp: geom } };
        const f = feature(temp, temp.objects.temp);
        if (geom.properties) f.properties = { ...geom.properties };
        return f;
      });
      return { type: "FeatureCollection", features };
    }

    const geojson = feature(topology, obj);
    const features = geojson.features ?? [geojson];
    return { type: "FeatureCollection", features };
  } catch {
    return null;
  }
}
