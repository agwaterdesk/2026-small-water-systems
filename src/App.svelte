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
      value: "pct_out_of_compliance",
      label: "Percent out of compliance",
      color: "#dd1c77",
      percentile: 100,
    },
    {
      value: "priority_system_count",
      label: "Enforcement priority systems",
      color: "#d97706",
      percentile: 90,
    },
    {
      value: "sum_health_viols",
      label: "Health-based violations",
      color: "#e74c3c",
      percentile: 90,
    },
    {
      value: "sum_acute_viols",
      label: "Acute health-based violations",
      color: "#922b21",
      percentile: 99,
    },
    {
      value: "sum_monitor_viols",
      label: "Monitoring & reporting violations",
      color: "#3b82f6",
      percentile: 90,
    },
    {
      value: "sum_public_notice",
      label: "Public notification & other violations",
      color: "#9b59b6",
      percentile: 90,
    },
  ];

  const VIEW_COLORS = Object.fromEntries(
    VIEW_OPTIONS.map((o) => [o.value, o.color]),
  );

  /** Violation category colors (shared by map and modal). Keys match system_lookup violations. */
  const VIOLATION_COLORS = {
    health: "#e74c3c",
    acute: "#922b21",
    monitor: "#3b82f6",
    public: "#9b59b6",
  };

  /** Badge-style pill colors (light bg, dark text) for modals. */
  const PILL_BADGE_STYLES = {
    pct_out_of_compliance: { bg: "#fee2e2", text: "#991b1b" },
    priority_system_count: { bg: "#fef3c7", text: "#92400e" },
    sum_health_viols: { bg: "#fee2e2", text: "#991b1b" },
    sum_acute_viols: { bg: "#fecaca", text: "#7f1d1d" },
    sum_monitor_viols: { bg: "#dbeafe", text: "#1e40af" },
    sum_public_notice: { bg: "#f3e8ff", text: "#6b21a8" },
    health: { bg: "#fee2e2", text: "#991b1b" },
    acute: { bg: "#fecaca", text: "#7f1d1d" },
    monitor: { bg: "#dbeafe", text: "#1e40af" },
    public: { bg: "#f3e8ff", text: "#6b21a8" },
    _fallback: { bg: "#f3f4f6", text: "#374151" },
  };

  /** Descriptions for each view. Keys match system_lookup violations. */
  const VIOLATION_DESCRIPTIONS = {
    pct_out_of_compliance:
      "Share of community water systems in a county with at least one violation.",
    priority_system_count:
      "Water systems that have serious, unresolved or repeated violations.",
    health:
      "Indicates that water samples have exceeded the legal limit for a specific contaminant or failed a mandatory treatment technique.",
    acute:
      "Health-based violations with the potential to produce immediate illness.",
    monitor:
      "Failure to conduct regular water quality monitoring or submit timely results to environmental agencies.",
    public:
      "Failure to alert consumers about serious drinking water problems that may pose a public health risk.",
    returned_to_compliance: "A formal designation that a water system has corrected its violations."
  };

  const VIEW_TOOLTIPS = {
    pct_out_of_compliance: VIOLATION_DESCRIPTIONS.pct_out_of_compliance,
    priority_system_count: VIOLATION_DESCRIPTIONS.priority_system_count,
    sum_health_viols: VIOLATION_DESCRIPTIONS.health,
    sum_acute_viols: VIOLATION_DESCRIPTIONS.acute,
    sum_monitor_viols: VIOLATION_DESCRIPTIONS.monitor,
    sum_public_notice: VIOLATION_DESCRIPTIONS.public,
  };

  const VIEW_DESCRIPTIONS = {
    pct_out_of_compliance: VIOLATION_DESCRIPTIONS.pct_out_of_compliance,
    priority_system_count: VIOLATION_DESCRIPTIONS.priority_system_count,
    sum_health_viols: VIOLATION_DESCRIPTIONS.health,
    sum_acute_viols: VIOLATION_DESCRIPTIONS.acute,
    sum_monitor_viols: VIOLATION_DESCRIPTIONS.monitor,
    sum_public_notice: VIOLATION_DESCRIPTIONS.public,
  };

  /** Short labels for pills. Keys match system_lookup violations. */
  const PILL_SHORT_LABELS = {
    pct_out_of_compliance: "Out of compliance",
    priority_system_count: "Enforcement Priority",
    health: "Health",
    acute: "Acute health",
    monitor: "Monitoring",
    public: "Public notice & other",
  };

  const VIEW_TO_PILL_KEY = {
    sum_health_viols: "health",
    sum_acute_viols: "acute",
    sum_monitor_viols: "monitor",
    sum_public_notice: "public",
  };

  /** Data property keys: rate (per 1k) vs count. Views without rate use same key. */
  const VIEW_DATA_KEYS = {
    pct_out_of_compliance: { rate: "pct_out_of_compliance", count: "pct_out_of_compliance" },
    priority_system_count: { rate: "rate_priority_per_1k", count: "sum_priority" },
    sum_health_viols: { rate: "rate_health_per_1k", count: "sum_health_viols" },
    sum_acute_viols: { rate: "rate_acute_per_1k", count: "sum_acute_viols" },
    sum_monitor_viols: { rate: "rate_monitor_per_1k", count: "sum_monitor_viols" },
    sum_public_notice: { rate: "rate_public_per_1k", count: "sum_public_notice" },
  };

  const RATEABLE_VIEWS = new Set([
    "priority_system_count",
    "sum_health_viols",
    "sum_acute_viols",
    "sum_monitor_viols",
    "sum_public_notice",
  ]);

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
  let useRateMode = $state(true);
  let searchQuery = $state("");
  let activeCounty = $state(null);
  let highlightedPwsId = $state(null);

  const effectiveDataKey = $derived(
    VIEW_DATA_KEYS[view]
      ? useRateMode
        ? VIEW_DATA_KEYS[view].rate
        : VIEW_DATA_KEYS[view].count
      : view,
  );

  const showRateToggle = $derived(RATEABLE_VIEWS.has(view));

  const currentViewOption = $derived(
    VIEW_OPTIONS.find((o) => o.value === view) ?? VIEW_OPTIONS[0],
  );

  const viewExtent = $derived.by(() => {
    const list = countiesList;
    const key = effectiveDataKey;
    if (!list.length || !key) return { min: 0, max: 0, maxCapped: false };
    const values = list
      .map((c) => c[key])
      .filter((n) => typeof n === "number" && !Number.isNaN(n));
    if (!values.length) return { min: 0, max: 0, maxCapped: false };
    const sorted = [...values].sort((a, b) => a - b);
    const dataMin = sorted[0];
    const isPct = key === "pct_out_of_compliance";
    const percentile = currentViewOption.percentile ?? 95;
    const pIdx = Math.min(
      Math.ceil((percentile / 100) * sorted.length) - 1,
      sorted.length - 1,
    );
    const pMax = sorted[Math.max(0, pIdx)];
    if (isPct) {
      return {
        min: Math.floor(dataMin * 10) / 10,
        max: Math.ceil(pMax * 10) / 10,
        maxCapped: true,
      };
    }
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
  <h1 class="headline">Smaller water districts struggle</h1>

  <p class="dek">
    According to the most recent EPA data, there are more than 13,000 community water systems (CWSs) in the Mississippi/Atchafalaya River Basin <span class="basin-svg-wrap"><BasinSvg width={20} fill="#B0B3B3" /></span> serving 10,000 people or less. Nearly 40% of those CWSs were out of compliance with federal clean water laws sometime in the 12 months that ended Sept. 30, 2025. This map shows the counties where those systems are located. 
  </p>

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
      isPercent={view === "pct_out_of_compliance"}
      isRate={useRateMode && showRateToggle}
      showRateToggle={showRateToggle}
      bind:useRateMode
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
        dataKey={effectiveDataKey}
        viewColors={VIEW_COLORS}
        pillBadgeStyles={PILL_BADGE_STYLES}
        {viewExtent}
        {pillShortLabels}
        {useRateMode}
        {activeCounty}
        {highlightedPwsId}
        onCountyClick={(props) => selectCounty(props)}
        onCwsHover={(id) => (highlightedPwsId = id)}
      />
    </div>

    <CountyModal
      county={activeCounty}
      dataKey={effectiveDataKey}
      violationColors={VIOLATION_COLORS}
      violationTooltips={VIOLATION_DESCRIPTIONS}
      pillBadgeStyles={PILL_BADGE_STYLES}
      {pillShortLabels}
      {view}
      viewOptions={VIEW_OPTIONS}
      useRateMode={useRateMode}
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


  
  <!-- {#if includeCredit} -->
    <div class="credit">
      Note: Since CWS boundaries don't always align with county lines, a system is included if 30% or more of its area falls within a county’s limits. System and violation data is for Fiscal Year 2025, which ended Sept. 30, 2025. Data: <a
        href="https://echo.epa.gov/trends/comparative-maps-dashboards/drinking-water-dashboard"
        target="_blank">EPA</a
      >; Graphic by Jared Whalen /
      <a target="_blank" href="https://agwaterdesk.org/">Ag & Water Desk</a>
    </div>
  <!-- {/if} -->
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
      grid-template-columns: 300px 1fr;
      align-items: end;
      gap: 1rem;
      margin-bottom: 0.5rem;

      @include mq("medium", $dir: "max-width") {
        grid-template-columns: 1fr;
        align-items: stretch;
      }
    }

    .legend-view-grid > *:last-child {
      min-width: 0;
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
      height: 500px;

  
    }
  }
</style>
