<script>
  import Window from "./components/Window.svelte";
  import Map from "./components/Map.svelte";
  import Legend from "./components/Legend.svelte";
  import BasinSvg from "./components/BasinSvg.svelte";
  import CountyModal from "./components/CountyModal.svelte";
  import DropdownControl from "./components/DropdownControl.svelte";
  import formatCountyName from "./utils/formatCountyName.js";
  import basin from "./data/mississippi-river-basin.json";
  import mississippiRiver from "./data/mississippi-river.json";
  import counties from "./data/counties.json";
  import { feature } from "topojson-client";
  import pym from "pym.js";

  new pym.Child({ polling: 500 });

  function getUrlParameter(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  let includeCredit = getUrlParameter("credit") != "false";

  const COUNTIES_OBJECT_NAME = "counties_fy25_data";

  const VIEW_OPTIONS = [
    {
      value: "percent_compliant",
      label: "Percent compliant",
      color: "#27ae60",
    },
    {
      value: "priority_system_count",
      label: "Enforcement priority systems",
      color: "#d97706",
    },
    {
      value: "sum_health_viols",
      label: "Health-based violations",
      color: "#e74c3c",
    },
    {
      value: "sum_acute_viols",
      label: "Acute health-based violations",
      color: "#922b21",
    },
    {
      value: "sum_monitor_viols",
      label: "Monitoring & reporting violations",
      color: "#3b82f6",
    },
    {
      value: "sum_public_notice",
      label: "Public notification & other violations",
      color: "#9b59b6",
    },
  ];

  const VIEW_COLORS = Object.fromEntries(
    VIEW_OPTIONS.map((o) => [o.value, o.color]),
  );

  /** Violation category colors (shared by map and modal). */
  const VIOLATION_COLORS = {
    health_based: "#e74c3c",
    acute_health_based: "#922b21",
    monitoring_reporting: "#3b82f6",
    public_notification_and_other: "#9b59b6",
  };

  /** Badge-style pill colors (light bg, dark text) for modals. */
  const PILL_BADGE_STYLES = {
    percent_compliant: { bg: "#d1fae5", text: "#065f46" },
    priority_system_count: { bg: "#fef3c7", text: "#92400e" },
    sum_health_viols: { bg: "#fee2e2", text: "#991b1b" },
    sum_acute_viols: { bg: "#fecaca", text: "#7f1d1d" },
    sum_monitor_viols: { bg: "#dbeafe", text: "#1e40af" },
    sum_public_notice: { bg: "#f3e8ff", text: "#6b21a8" },
    health_based: { bg: "#fee2e2", text: "#991b1b" },
    acute_health_based: { bg: "#fecaca", text: "#7f1d1d" },
    monitoring_reporting: { bg: "#dbeafe", text: "#1e40af" },
    public_notification_and_other: { bg: "#f3e8ff", text: "#6b21a8" },
    _fallback: { bg: "#f3f4f6", text: "#374151" },
  };

  /** Descriptions for each view*/
  const VIOLATION_DESCRIPTIONS = {
    percent_compliant:
      "Share of Community Water Systems in the county serving fewer than 10k people with no active violations.",
    priority_system_count:
      "Water systems that have serious, unresolved, or repeated violations.",
    health_based:
      "Indicates that water samples have exceeded the legal limit for a specific contaminant or failed a mandatory treatment technique.",
    acute_health_based:
      "Health-based violations with the potential to produce immediate illness.",
    monitoring_reporting:
      "Failure to conduct regular water quality monitoring or timely submit results to environmental agencies.",
    public_notification_and_other:
      "Failure to alert consumers about serious drinking water problems that may pose a public health risk.",
    returned_to_compliance: "A formal designation that a water system has corrected its violations."
  };
  

  const VIEW_TOOLTIPS = {
    percent_compliant: VIOLATION_DESCRIPTIONS.percent_compliant,
    priority_system_count: VIOLATION_DESCRIPTIONS.priority_system_count,
    sum_health_viols: VIOLATION_DESCRIPTIONS.health_based,
    sum_acute_viols: VIOLATION_DESCRIPTIONS.acute_health_based,
    sum_monitor_viols: VIOLATION_DESCRIPTIONS.monitoring_reporting,
    sum_public_notice: VIOLATION_DESCRIPTIONS.public_notification_and_other,
  };

  const VIEW_DESCRIPTIONS = {
    percent_compliant: VIOLATION_DESCRIPTIONS.percent_compliant,
    priority_system_count: VIOLATION_DESCRIPTIONS.priority_system_count,
    sum_health_viols: VIOLATION_DESCRIPTIONS.health_based,
    sum_acute_viols: VIOLATION_DESCRIPTIONS.acute_health_based,
    sum_monitor_viols: VIOLATION_DESCRIPTIONS.monitoring_reporting,
    sum_public_notice: VIOLATION_DESCRIPTIONS.public_notification_and_other,
  };

  /** Short labels for pills — one per type. View keys map to violation keys for shared types. */
  const PILL_SHORT_LABELS = {
    percent_compliant: "Percent compliant",
    priority_system_count: "Enforcement Priority",
    health_based: "Health",
    acute_health_based: "Acute health",
    monitoring_reporting: "Monitoring",
    public_notification_and_other: "Public notice & other",
  };

  const VIEW_TO_PILL_KEY = {
    sum_health_viols: "health_based",
    sum_acute_viols: "acute_health_based",
    sum_monitor_viols: "monitoring_reporting",
    sum_public_notice: "public_notification_and_other",
  };

  const pillShortLabels = {
    ...PILL_SHORT_LABELS,
    ...Object.fromEntries(
      Object.entries(VIEW_TO_PILL_KEY).map(([k, v]) => [
        k,
        PILL_SHORT_LABELS[v],
      ]),
    ),
  };

  let view = $state(VIEW_OPTIONS[0].value);
  let searchQuery = $state("");
  let activeCounty = $state(null);
  let highlightedPwsId = $state(null);

  const currentViewOption = $derived(
    VIEW_OPTIONS.find((o) => o.value === view) ?? VIEW_OPTIONS[0],
  );

  /** Scale extent: use percentiles to avoid outliers dominating. 95th percentile as max. */
  const PERCENTILE = 95;
  const PERCENTILE_ACUTE = 99;

  const viewExtent = $derived.by(() => {
    const list = countiesList;
    const key = view;
    if (!list.length || !key) return { min: 0, max: 0, maxCapped: false };
    const values = list
      .map((c) => c[key])
      .filter((n) => typeof n === "number" && !Number.isNaN(n));
    if (!values.length) return { min: 0, max: 0, maxCapped: false };
    const sorted = [...values].sort((a, b) => a - b);
    const dataMin = sorted[0];
    const dataMax = sorted[sorted.length - 1];
    const isPct = key === "percent_compliant";
    const use99th = key === "sum_acute_viols";
    if (use99th) {
      const pIdx = Math.min(
        Math.ceil((PERCENTILE_ACUTE / 100) * sorted.length) - 1,
        sorted.length - 1,
      );
      const pMax = sorted[Math.max(0, pIdx)];
      const min = Math.floor(dataMin);
      const max = Math.ceil(pMax);
      return { min, max, maxCapped: true };
    }
    if (isPct) {
      const pIdx = Math.min(
        Math.ceil((PERCENTILE / 100) * sorted.length) - 1,
        sorted.length - 1,
      );
      const pMax = sorted[Math.max(0, pIdx)];
      return {
        min: Math.floor(dataMin * 10) / 10,
        max: Math.ceil(pMax * 10) / 10,
        maxCapped: true,
      };
    }
    const pIdx = Math.min(
      Math.ceil((PERCENTILE / 100) * sorted.length) - 1,
      sorted.length - 1,
    );
    const pMax = sorted[Math.max(0, pIdx)];
    const min = Math.floor(dataMin);
    const max = Math.ceil(pMax);
    return { min, max, maxCapped: true };
  });

  function topojsonToFeatures(topology, objectName) {
    const obj =
      topology?.objects?.[objectName] ??
      topology?.objects?.[Object.keys(topology.objects)[0]];
    if (!obj) return [];
    if (obj.type === "GeometryCollection") {
      return obj.geometries.map((geom) => {
        const temp = { ...topology, objects: { temp: geom } };
        const f = feature(temp, temp.objects.temp);
        if (geom.properties) f.properties = { ...geom.properties };
        return f;
      });
    }
    const geojson = feature(topology, obj);
    return geojson.type === "FeatureCollection" ? geojson.features : [geojson];
  }

  const countiesList = $derived.by(() => {
    if (!counties?.objects) return [];
    const name = counties.objects[COUNTIES_OBJECT_NAME]
      ? COUNTIES_OBJECT_NAME
      : Object.keys(counties.objects)[0];
    const features = name ? topojsonToFeatures(counties, name) : [];
    return features.map((f) => ({ ...f.properties, _feature: f }));
  });

  const filteredCounties = $derived.by(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matches = countiesList.filter((c) =>
      String(c.NAME || "")
        .toLowerCase()
        .includes(q),
    );
    return matches.sort((a, b) => {
      const stateA = String(a.STUSPS || "").toUpperCase();
      const stateB = String(b.STUSPS || "").toUpperCase();
      if (stateA !== stateB) return stateA.localeCompare(stateB);
      return String(a.NAME || "").localeCompare(
        String(b.NAME || ""),
        undefined,
        {
          sensitivity: "base",
        },
      );
    });
  });

  function selectCounty(county) {
    activeCounty = county;
    searchQuery = "";
  }
</script>

<Window />
<!-- Outer div must have class 'chart-container' don't change -->
<div class="chart-container">
  <h1 class="headline">Water system violations in the Mississippi River Basin</h1>

  <p class="dek">
    This map shows compliancy data for Community Water Districts (CWS) serving fewer than 10,000 people for
    counties in the <span class="basin-svg-wrap"><BasinSvg width={20} fill="#B0B3B3" /></span>
    Mississippi/Atchafalaya River Basin. Since CWS boundaries don't neatly align with counties, a system is
    included if 30% or more of its area falls within county limits. Data is for FY 2025.
  </p>
  <p class="sr-only"></p>

  <div class="legend-view-grid">
    <div class="dropdowns">
      <DropdownControl
      id="view-county"
      label="View county data for"
      mode="select"
      options={VIEW_OPTIONS}
      value={view}
      onSelect={(v) => (view = v)}
    />
    <DropdownControl
      id="search-county"
      label="Search county"
      mode="search"
      {searchQuery}
      onSearchChange={(q) => (searchQuery = q)}
      searchResults={filteredCounties}
      getOptionLabel={(c) => formatCountyName(c.GEOID, c.NAME, c.STUSPS)}
      getOptionValue={(c) => c.GEOID}
      placeholder="Type county name..."
      onSelectResult={(c) => selectCounty(c)}
    />
    </div>
    <Legend
      viewLabel={currentViewOption.label}
      viewColor={currentViewOption.color}
      viewDescription={VIEW_DESCRIPTIONS[view] ?? ""}
      extentMin={viewExtent.min}
      extentMax={viewExtent.max}
      extentMaxCapped={viewExtent.maxCapped}
      isPercent={view === "percent_compliant"}
    />
  </div>

  <div class="search-row">
    
  </div>

  <div class="viz-and-modal">
    <div id="g-viz">
      <Map
        {basin}
        {mississippiRiver}
        {counties}
        {view}
        viewColors={VIEW_COLORS}
        pillBadgeStyles={PILL_BADGE_STYLES}
        {viewExtent}
        {pillShortLabels}
        {activeCounty}
        {highlightedPwsId}
        onCountyClick={(props) => selectCounty(props)}
        onCwsHover={(id) => (highlightedPwsId = id)}
      />
    </div>

    <CountyModal
      county={activeCounty}
      violationColors={VIOLATION_COLORS}
      violationTooltips={VIOLATION_DESCRIPTIONS}
      pillBadgeStyles={PILL_BADGE_STYLES}
      {pillShortLabels}
      {view}
      viewOptions={VIEW_OPTIONS}
      viewColors={VIEW_COLORS}
      viewTooltips={VIEW_TOOLTIPS}
      {highlightedPwsId}
      onSystemHover={(id) => (highlightedPwsId = id)}
      onClose={() => {
        activeCounty = null;
        highlightedPwsId = null;
      }}
    />
  </div>

  {#if includeCredit}
    <div class="credit">
      Data: <a
        href="https://echo.epa.gov/trends/comparative-maps-dashboards/drinking-water-dashboard"
        target="_blank">EPA</a
      >; Graphic by Jared Whalen /
      <a target="_blank" href="https://agwaterdesk.org/">Ag & Water Desk</a>
    </div>
  {/if}
</div>

<style lang="scss">
  .dek {
    font-size: 0.875rem;
    font-weight: 400;
    color: #333;
    line-height: 1.45;
  }

  .basin-svg-wrap {
    display: inline;
    vertical-align: middle;
  }

  .basin-svg-wrap :global(svg) {
    display: inline-block;
    vertical-align: middle;
  }

  .chart-container {
    max-width: 800px;
    width: 100%;
    padding: 0.5rem;

    .legend-view-grid {
      position: relative;
      z-index: 30;
      display: grid;
      grid-template-columns: 1fr 400px;
      align-items: end;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .dropdowns {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .viz-and-modal {
      position: relative;
      width: 100%;
    }

    #g-viz {
      position: relative;
      width: 100%;
      height: 600px;
      @include mq(600px, "max-width") {
        height: 600px;
      }
    }
  }
</style>
