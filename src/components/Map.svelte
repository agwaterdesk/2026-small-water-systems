<script>
    import { onMount } from "svelte";
    import mapboxgl from "mapbox-gl";
    import "mapbox-gl/dist/mapbox-gl.css";
    import { feature } from "topojson-client";
    import formatCountyName from "../utils/formatCountyName.js";
    import fetchCwsBounds from "../utils/fetchCwsBounds.js";
    import systemLookup from "../data/system_lookup_fy25.json";

    let {
        basin,
        mississippiRiver = null,
        counties,
        view,
        viewColors = {},
        pillBadgeStyles = {},
        viewExtent = { min: 0, max: 100 },
        pillShortLabels = {},
        activeCounty = null,
        onCountyClick,
        highlightedPwsId = null,
        onCwsHover = () => {},
    } = $props();

    let map = $state(null);
    let isLoaded = $state(false);
    let hoverPopup = $state(null);

    const viewRef = { current: view };
    const pillShortLabelsRef = { current: pillShortLabels };
    const viewColorsRef = { current: viewColors };
    const pillBadgeStylesRef = { current: pillBadgeStyles };
    $effect(() => {
        viewRef.current = view;
        pillShortLabelsRef.current = pillShortLabels;
        viewColorsRef.current = viewColors;
        pillBadgeStylesRef.current = pillBadgeStyles;
    });

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

    const COUNTIES_OBJECT_NAME = "counties_fy25_data";

    function topojsonToGeojson(topology, objectName) {
        const obj = topology.objects[objectName];
        if (!obj) return { type: "FeatureCollection", features: [] };

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
        return geojson.type === "FeatureCollection"
            ? geojson
            : { type: "FeatureCollection", features: [geojson] };
    }

    function processCoords(coords, fn) {
        if (Array.isArray(coords[0]))
            coords.forEach((c) => processCoords(c, fn));
        else fn(coords[0], coords[1]);
    }

    function getFeatureBounds(f) {
        let minLon = Infinity,
            minLat = Infinity,
            maxLon = -Infinity,
            maxLat = -Infinity;
        if (f.geometry?.coordinates) {
            processCoords(f.geometry.coordinates, (lon, lat) => {
                minLon = Math.min(minLon, lon);
                minLat = Math.min(minLat, lat);
                maxLon = Math.max(maxLon, lon);
                maxLat = Math.max(maxLat, lat);
            });
        }
        return [minLon, minLat, maxLon, maxLat];
    }

    function calculateBounds(geojson) {
        let minLon = Infinity,
            minLat = Infinity,
            maxLon = -Infinity,
            maxLat = -Infinity;
        if (geojson.features) {
            geojson.features.forEach((f) => {
                if (f.geometry?.coordinates)
                    processCoords(f.geometry.coordinates, (lon, lat) => {
                        minLon = Math.min(minLon, lon);
                        minLat = Math.min(minLat, lat);
                        maxLon = Math.max(maxLon, lon);
                        maxLat = Math.max(maxLat, lat);
                    });
            });
        } else if (geojson.geometry?.coordinates) {
            processCoords(geojson.geometry.coordinates, (lon, lat) => {
                minLon = Math.min(minLon, lon);
                minLat = Math.min(minLat, lat);
                maxLon = Math.max(maxLon, lon);
                maxLat = Math.max(maxLat, lat);
            });
        }
        return new mapboxgl.LngLatBounds([minLon, minLat], [maxLon, maxLat]);
    }

    function createStripedPattern() {
        const size = 16;
        const data = new Uint8Array(size * size * 4);
        const light = [0xe5, 0xe5, 0xe5, 220];
        const dark = [0x99, 0x99, 0x99, 255];
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = (y * size + x) * 4;
                const isStripe = (x + y) % 4 < 2;
                const c = isStripe ? dark : light;
                data[i] = c[0];
                data[i + 1] = c[1];
                data[i + 2] = c[2];
                data[i + 3] = c[3];
            }
        }
        return { width: size, height: size, data };
    }

    const countiesGeoJSON = $derived.by(() => {
        if (!counties) return null;
        if (counties.type === "Topology" && counties.objects) {
            const name = counties.objects[COUNTIES_OBJECT_NAME]
                ? COUNTIES_OBJECT_NAME
                : Object.keys(counties.objects)[0];
            return name ? topojsonToGeojson(counties, name) : null;
        }
        if (counties.type === "FeatureCollection" && counties.features)
            return counties;
        return null;
    });

    onMount(() => {
        if (!basin) return;

        const bounds = calculateBounds(basin);
        map = new mapboxgl.Map({
            container: "map",
            style: "mapbox://styles/agwaterdesk/cml48k31w000o01ry27q24csl",
            interactive: true,
            maxPitch: 0,
            pitchWithRotate: false,
            dragRotate: false,
            touchZoomRotate: false,
        });

        map.fitBounds(bounds, { duration: 0, padding: 50 });
        map.setMaxBounds(bounds);
        map.setMaxZoom(12);
        map.addControl(
            new mapboxgl.NavigationControl({
                showCompass: false,
                visualizePitch: false,
            }),
            "top-right",
        );

        map.on("load", () => {
            isLoaded = true;

            const geo = countiesGeoJSON;
            if (geo?.features?.length) {
                const scaleMax = Math.max(viewExtent.max, 1);
                const fillColor = viewColors[view] ?? "#3498db";
                map.addSource("counties", {
                    type: "geojson",
                    data: geo,
                    promoteId: "GEOID",
                });
                map.addLayer({
                    id: "counties-fill",
                    type: "fill",
                    source: "counties",
                    paint: {
                        "fill-color": [
                            "interpolate",
                            ["linear"],
                            ["min", ["coalesce", ["get", view], 0], scaleMax],
                            0,
                            "white",
                            scaleMax,
                            fillColor,
                        ],
                        "fill-opacity": 1,
                    },
                });
                map.addLayer({
                    id: "counties-outline",
                    type: "line",
                    source: "counties",
                    paint: {
                        "line-color": [
                            "case",
                            ["boolean", ["feature-state", "hover"], false],
                            "#111",
                            "#333",
                        ],
                        "line-width": [
                            "case",
                            ["boolean", ["feature-state", "hover"], false],
                            2,
                            0.5,
                        ],
                        "line-opacity": [
                            "case",
                            ["boolean", ["feature-state", "hover"], false],
                            0.9,
                            0.35,
                        ],
                    },
                });
                map.addLayer({
                    id: "counties-active-outline",
                    type: "line",
                    source: "counties",
                    filter: ["==", ["get", "GEOID"], ""],
                    paint: {
                        "line-color": "#111",
                        "line-width": 2,
                        "line-opacity": 1,
                    },
                });

                map.addImage("cws-stripe", createStripedPattern());

                map.addSource("cws-bounds", {
                    type: "geojson",
                    data: { type: "FeatureCollection", features: [] },
                });
                map.addLayer({
                    id: "cws-bounds-fill",
                    type: "fill",
                    source: "cws-bounds",
                    paint: {
                        "fill-pattern": "cws-stripe",
                        "fill-opacity": 0.75,
                    },
                });
                map.addLayer({
                    id: "cws-bounds-outline",
                    type: "line",
                    source: "cws-bounds",
                    paint: {
                        "line-color": "#666",
                        "line-width": 1,
                        "line-opacity": 0.8,
                    },
                });
                map.addLayer({
                    id: "cws-bounds-highlight",
                    type: "line",
                    source: "cws-bounds",
                    filter: ["==", ["get", "pws_id"], ""],
                    paint: {
                        "line-color": "#333",
                        "line-width": 3,
                        "line-opacity": 1,
                    },
                });

                if (basin) {
                    map.addSource("basin", { type: "geojson", data: basin });
                    map.addLayer({
                        id: "basin-outline",
                        type: "line",
                        source: "basin",
                        paint: {
                            "line-color": "#666",
                            "line-width": 2,
                            "line-opacity": 1,
                        },
                    });
                }

                if (mississippiRiver?.type === "Topology" && mississippiRiver.objects) {
                    const riverObjName = Object.keys(mississippiRiver.objects)[0];
                    const riverGeo = riverObjName
                        ? topojsonToGeojson(mississippiRiver, riverObjName)
                        : null;
                    if (riverGeo?.features?.length) {
                        map.addSource("mississippi-river", {
                            type: "geojson",
                            data: riverGeo,
                        });
                        map.addLayer({
                            id: "mississippi-river-line-bg",
                            type: "line",
                            source: "mississippi-river",
                            paint: {
                                "line-color": "#fff",
                                "line-width": 4,
                                "line-opacity": 1,
                            },
                        });

                        map.addLayer({
                            id: "mississippi-river-line",
                            type: "line",
                            source: "mississippi-river",
                            paint: {
                                "line-color": "#548687",
                                "line-width": 2,
                                "line-opacity": 1,
                            },
                        });
                    }
                }

                const popup = new mapboxgl.Popup({
                    closeButton: false,
                    closeOnClick: false,
                });
                hoverPopup = popup;

                let hoveredCountyId = null;

                map.on("mousemove", "counties-fill", (e) => {
                    if (activeCounty) return;
                    map.getCanvas().style.cursor = "pointer";
                    if (hoveredCountyId) {
                        map.removeFeatureState({
                            source: "counties",
                            id: hoveredCountyId,
                        });
                    }
                    const feat = e.features?.[0];
                    if (feat?.id != null) {
                        hoveredCountyId = feat.id;
                        map.setFeatureState(
                            { source: "counties", id: feat.id },
                            { hover: true },
                        );
                    } else {
                        hoveredCountyId = null;
                    }
                    const props = feat?.properties;
                    const label = props
                        ? formatCountyName(
                              props.GEOID,
                              props.NAME,
                              props.STUSPS,
                          )
                        : "";
                    if (label) {
                        const v = viewRef.current;
                        const labels = pillShortLabelsRef.current;
                        const rawVal = props?.[v];
                        const numVal = typeof rawVal === "number" && !Number.isNaN(rawVal) ? rawVal : null;
                        const isViolation = v !== "percent_compliant" && v !== "priority_system_count";
                        const isPriority = v === "priority_system_count";
                        const displayVal =
                            numVal != null
                                ? v === "percent_compliant"
                                    ? `${numVal.toFixed(1)}%`
                                    : isPriority
                                        ? `${numVal.toLocaleString()} priority system${numVal === 1 ? "" : "s"}`
                                        : isViolation
                                            ? `${numVal.toLocaleString()} violation${numVal === 1 ? "" : "s"}`
                                            : numVal.toLocaleString()
                                : "—";
                        const shortLabel = labels[v] ?? v;
                        const badge = pillBadgeStylesRef.current[v] ?? pillBadgeStylesRef.current._fallback ?? { bg: "#f3f4f6", text: "#374151" };
                        const pillStyle = `display: inline-flex; align-items: baseline; gap: 0.25rem; font-size: 0.6875rem; font-weight: 600; padding: 0.2rem 0.45rem; background: ${badge.bg}; color: ${badge.text}; border-radius: 4px; white-space: nowrap; max-width: 180px;`;
                        const labelStyle = `min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
                        const summaryHtml = `<div style="margin-top: 0.35rem;"><span style="${pillStyle}"><span style="${labelStyle}">${shortLabel}</span><span style="flex-shrink: 0; opacity: 0.8; font-size: 0.6rem;">×</span><span style="flex-shrink: 0; font-feature-settings: &quot;tnum&quot;; font-weight: 700;">${displayVal}</span></span></div>`;
                        popup
                            .setLngLat(e.lngLat)
                            .setHTML(`<strong>${label}</strong>${summaryHtml}`)
                            .addTo(map);
                    }
                });

                map.on("mouseleave", "counties-fill", () => {
                    if (activeCounty) return;
                    map.getCanvas().style.cursor = "";
                    popup.remove();
                    if (hoveredCountyId != null) {
                        map.removeFeatureState({
                            source: "counties",
                            id: hoveredCountyId,
                        });
                        hoveredCountyId = null;
                    }
                });

                map.on("mousemove", "cws-bounds-fill", (e) => {
                    map.getCanvas().style.cursor = "pointer";
                    const pwsId = e.features?.[0]?.properties?.pws_id;
                    if (typeof onCwsHover === "function")
                        onCwsHover(pwsId ?? null);
                    if (activeCounty && pwsId) {
                        const sys = systemLookup[pwsId];
                        const label = sys?.name ?? pwsId;
                        popup
                            .setLngLat(e.lngLat)
                            .setHTML(`<strong>${label}</strong>`)
                            .addTo(map);
                    }
                });

                map.on("mouseleave", "cws-bounds-fill", () => {
                    if (typeof onCwsHover === "function") onCwsHover(null);
                    popup.remove();
                });

                map.on("click", "counties-fill", (e) => {
                    const props = e.features?.[0]?.properties;
                    if (props && typeof onCountyClick === "function")
                        onCountyClick(props);
                });
            }
        });
    });

    $effect(() => {
        if (activeCounty && hoverPopup) hoverPopup.remove();
    });

    $effect(() => {
        const currentView = view;
        const mapInstance = map;
        const loaded = isLoaded;
        const geo = countiesGeoJSON;
        const colors = viewColors;

        if (!mapInstance || !loaded || !geo?.features?.length) return;

        const source = mapInstance.getSource("counties");
        if (!source) return;

        source.setData(geo);

        if (mapInstance.getLayer("counties-fill")) {
            const scaleMax = Math.max(viewExtent.max, 1);
            const fillColor = colors[currentView] ?? "#3498db";
            mapInstance.setPaintProperty("counties-fill", "fill-color", [
                "interpolate",
                ["linear"],
                ["min", ["coalesce", ["get", currentView], 0], scaleMax],
                0,
                "white",
                scaleMax,
                fillColor,
            ]);
            mapInstance.setPaintProperty("counties-fill", "fill-opacity", 1);
        }
    });

    const MODAL_OFFSET_PX = 320;
    const emptyGeoJSON = { type: "FeatureCollection", features: [] };

    $effect(() => {
        const county = activeCounty;
        const mapInstance = map;
        const geo = countiesGeoJSON;
        const highlighted = highlightedPwsId;
        if (!mapInstance || !geo?.features?.length) return;

        const activeLayer = mapInstance.getLayer("counties-active-outline");
        if (activeLayer) {
            mapInstance.setFilter(
                "counties-active-outline",
                county?.GEOID
                    ? ["==", ["get", "GEOID"], county.GEOID]
                    : ["==", ["get", "GEOID"], ""],
            );
        }

        const cwsSource = mapInstance.getSource("cws-bounds");
        if (cwsSource) {
            if (!county?.GEOID) {
                cwsSource.setData(emptyGeoJSON);
            } else {
                cwsSource.setData(emptyGeoJSON);
                const geoid = county.GEOID;
                fetchCwsBounds(geoid).then((cwsGeo) => {
                    if (
                        cwsGeo?.features?.length &&
                        activeCounty?.GEOID === geoid
                    ) {
                        cwsSource.setData(cwsGeo);
                    }
                });
            }
        }

        const highlightLayer = mapInstance.getLayer("cws-bounds-highlight");
        if (highlightLayer) {
            mapInstance.setFilter(
                "cws-bounds-highlight",
                highlighted
                    ? ["==", ["get", "pws_id"], highlighted]
                    : ["==", ["get", "pws_id"], ""],
            );
        }
    });

    $effect(() => {
        const county = activeCounty;
        const mapInstance = map;
        const geo = countiesGeoJSON;
        if (!mapInstance || !geo?.features?.length || !county?.GEOID) return;

        const f = geo.features.find(
            (feat) => feat.properties?.GEOID === county.GEOID,
        );
        if (!f) return;

        const [minLon, minLat, maxLon, maxLat] = getFeatureBounds(f);
        if (minLon === Infinity) return;

        mapInstance.fitBounds(
            [
                [minLon, minLat],
                [maxLon, maxLat],
            ],
            {
                padding: {
                    top: 40,
                    bottom: 40,
                    left: MODAL_OFFSET_PX,
                    right: 40,
                },
                maxZoom: 10,
                duration: 500,
            },
        );
    });
</script>

<div id="map"></div>

<style lang="scss">
    #map {
        width: 100%;
        height: 100%;
        margin-top: 0.5rem;
    }

    :global {
        .mapboxgl-popup-content {
            font-family: var(
                --font-sans,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                Roboto,
                "Helvetica Neue",
                Arial,
                sans-serif
            );
            padding: 0.4rem 0.6rem;
            font-size: 0.875rem;
            width: 100%;
        }
    }
</style>
