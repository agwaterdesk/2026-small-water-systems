<script>
  import tippy from "tippy.js";
  import "tippy.js/dist/tippy.css";
  import systemLookup from "../data/system_lookup_fy25.json";
  import formatCountyName from "../utils/formatCountyName.js";

  function pillTooltip(node, content) {
    if (!content) return;
    const instances = tippy(node, {
      content,
      theme: "map-tooltip",
      allowHTML: true,
      placement: "top",
      arrow: true,
      offset: [0, 6],
    });
    const list = Array.isArray(instances) ? instances : [instances];
    return {
      destroy: () => list.forEach((i) => i.destroy()),
    };
  }

  let {
    county = null,
    violationColors = {},
    violationTooltips = {},
    pillBadgeStyles = {},
    pillShortLabels = {},
    view = "",
    viewOptions = [],
    viewColors = {},
    viewTooltips = {},
    highlightedPwsId = null,
    onSystemHover,
    onClose,
  } = $props();

  const countyLabel = $derived(
    county ? formatCountyName(county.GEOID, county.NAME, county.STUSPS) : "",
  );

  const STATUS_ORDER = ["Enforcement Priority", "Violation(s)", "No Violation"];

  const pwsidList = $derived.by(() => {
    if (!county?.pwsid_list) return [];
    const raw = county.pwsid_list;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : parsed != null ? [parsed] : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  function totalViolationCount(violations) {
    if (!violations) return 0;
    return Object.values(violations).reduce((sum, v) => {
      const n =
        v === "NA" || v == null
          ? 0
          : typeof v === "number"
            ? v
            : parseInt(v, 10) || 0;
      return sum + n;
    }, 0);
  }

  function statusSortIndex(status) {
    const i = STATUS_ORDER.indexOf(status || "No Violation");
    return i >= 0 ? i : STATUS_ORDER.length;
  }

  const systems = $derived.by(() => {
    const list = pwsidList.map((pwsid) => ({
      pwsid,
      ...systemLookup[pwsid],
    }));
    return list.sort((a, b) => {
      const aStatus = a.status || "No Violation";
      const bStatus = b.status || "No Violation";
      const statusDiff = statusSortIndex(aStatus) - statusSortIndex(bStatus);
      if (statusDiff !== 0) return statusDiff;
      const aCount = totalViolationCount(a.violations);
      const bCount = totalViolationCount(b.violations);
      return bCount - aCount; // highest violations first within same status
    });
  });

  const badgeFallback = pillBadgeStyles._fallback ?? {
    bg: "#f3f4f6",
    text: "#374151",
  };

  function getViolationPills(violations) {
    if (!violations) return [];
    const pills = [];
    for (const [key, count] of Object.entries(violations)) {
      const n =
        count === "NA" || count == null
          ? 0
          : typeof count === "number"
            ? count
            : parseInt(count, 10) || 0;
      if (n > 0 && violationColors[key]) {
        const label = pillShortLabels[key] ?? key;
        const customTooltip = violationTooltips[key] || "";
        const fallback = `${label}: ${n} violation${n === 1 ? "" : "s"}`;
        const tooltipContent = customTooltip || fallback;
        const badge = pillBadgeStyles[key] ?? badgeFallback;
        pills.push({
          key,
          label,
          count: n,
          bg: badge.bg,
          text: badge.text,
          tooltipContent,
        });
      }
    }
    return pills;
  }

  const currentViewOption = $derived(
    viewOptions.find((o) => o.value === view) ?? viewOptions[0],
  );
</script>

{#if county}
  <div class="county-modal" role="dialog" aria-label="County details">
    <div class="county-modal-header">
      <div class="header-row">
        <h2>{countyLabel}</h2>
        <button
          type="button"
          class="close"
          onclick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div class="county-summary">
        <div class="summary-pills">
          {#if currentViewOption}
            {@const opt = currentViewOption}
            {@const rawVal = county?.[opt.value]}
            {@const numVal =
              typeof rawVal === "number" && !Number.isNaN(rawVal)
                ? rawVal
                : null}
            {@const displayVal =
              numVal != null
                ? opt.value === "percent_compliant"
                  ? `${numVal.toFixed(1)}%`
                  : numVal.toLocaleString()
                : "—"}
            {@const shortLabel = pillShortLabels[opt.value] ?? opt.label}
            {@const customTooltip = viewTooltips[opt.value] || ""}
            {@const fallback = `${opt.label}: ${displayVal}`}
            {@const tooltipContent = customTooltip || fallback}
            {@const badge = pillBadgeStyles[opt.value] ?? badgeFallback}
            <span
              class="summary-pill"
              style="--pill-bg: {badge.bg}; --pill-text: {badge.text}"
              use:pillTooltip={tooltipContent}
            >
              <span class="pill-label">{shortLabel}</span>
              <span class="pill-sep">×</span>
              <span class="pill-count">{displayVal}</span>
            </span>
          {/if}
        </div>
      </div>
      <div class="header-meta">

        <span class="cws-key" title="CWS service areas on map">
          <span class="cws-key-swatch"></span>
          <span class="section-label">Community Water Districts</span>
        </span>
      </div>
    </div>
    <div class="county-modal-body">
      <div class="system-list" role="list">
        {#each systems as sys, i (sys.pwsid ?? `sys-${i}`)}
          <div
            class="system-card"
            class:highlighted={highlightedPwsId === sys.pwsid}
            role="listitem"
            onmouseenter={() =>
              typeof onSystemHover === "function" && onSystemHover(sys.pwsid)}
            onmouseleave={() =>
              typeof onSystemHover === "function" && onSystemHover(null)}
          >
            <div class="system-header">
              <span class="system-name">{sys.name ?? sys.pwsid}</span>
            </div>
            <div class="system-status-row">
              {#if sys.status === "Enforcement Priority"}
                <span
                  class="status-badge status-priority"
                  use:pillTooltip={violationTooltips.priority_system_count || ""}
                  >Enforcement Priority</span
                >
              {/if}
              {#if sys.rtc}
                <span
                  class="status-badge status-rtc"
                  use:pillTooltip={violationTooltips.returned_to_compliance || ""}
                  >Returned to compliance</span
                >
              {/if}
            </div>
            <div class="system-meta">
              <span class="pop"
                >Pop. served: {sys.pop != null
                  ? sys.pop.toLocaleString()
                  : "—"}</span
              >
            </div>

            <div class="violations-section">
              {#if sys.violations}
                {@const pills = getViolationPills(sys.violations)}
                {#if pills.length > 0}
                  <span class="violations-heading">Violations</span>
                  <div class="violation-pills">
                    {#each pills as pill, pi (pill.key + "-" + pi)}
                      <span
                        class="violation-pill"
                        style="--pill-bg: {pill.bg}; --pill-text: {pill.text}"
                        use:pillTooltip={pill.tooltipContent}
                      >
                        <span class="pill-label">{pill.label}</span>
                        <span class="pill-sep">×</span>
                        <span class="pill-count">{pill.count}</span>
                      </span>
                    {/each}
                  </div>
                {:else}
                  <span class="violations-heading">No violations</span>
                {/if}
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .county-modal {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    width: 300px;
    max-width: 90%;
    max-height: calc(100% - 1rem);
    background: #fff;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    z-index: 20;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .county-modal-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
  }

  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    color: #666;
    margin-top: 1rem;
  }

  .cws-key {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .cws-key-swatch {
    width: 20px;
    height: 20px;
    background: repeating-linear-gradient(
      -45deg,
      #999,
      #999 2px,
      #e5e5e5 2px,
      #e5e5e5 4px
    );
    border-radius: 1px;
  }

  .county-modal-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .county-modal-header .close {
    background: none;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    padding: 0.25rem;
    color: #666;
  }

  .county-modal-header .close:hover {
    color: #333;
  }

  .county-modal-body {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
  }

  .section-label {
    font-weight: 600;
    color: #333;
  }

  .summary-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .summary-pill {
    display: inline-flex;
    align-items: baseline;
    gap: 0.25rem;
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.2rem 0.45rem;
    background: var(--pill-bg, #f3f4f6);
    color: var(--pill-text, #374151);
    border-radius: 4px;
    cursor: help;
    white-space: nowrap;
    max-width: 100%;
  }

  .summary-pill .pill-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .summary-pill .pill-sep {
    flex-shrink: 0;
    opacity: 0.8;
    font-size: 0.6rem;
  }

  .summary-pill .pill-count {
    flex-shrink: 0;
    font-feature-settings: "tnum";
    font-weight: 700;
  }

  .system-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .system-card {
    padding: 0.6rem;
    background: #f9f9f9;
    transition:
      box-shadow 0.15s ease,
      border-color 0.15s ease;

    &.highlighted {
      box-shadow: 0 0 0 2px #333;
    }
  }

  .system-header {
    margin-bottom: 0.25rem;
  }

  .system-name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #333;
    display: block;
  }

  .system-status-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.35rem;
  }

  .status-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.125rem 0.25rem;
    border-radius: 0;
    letter-spacing: 0.02em;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    border: 1px solid;
  }

  .status-priority {
    background: #fef3c7;
    color: #92400e;
    cursor: help;
  }

  .status-rtc {
    background: #d1fae5;
    color: #065f46;
    cursor: help;
  }

  .status-clear {
    background: #d1fae5;
    color: #065f46;
  }

  .violations-section {
    margin-top: 0.75rem;
  }

  .violations-heading {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #666;
    margin: 0.5rem 0px 0.25rem;
  }

  .system-meta {
    font-size: 0.75rem;
    color: #666;
    margin-bottom: 0.25rem;
  }

  .system-meta .pop {
    font-family: ui-monospace, monospace;
  }

  .violation-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.25rem;
  }

  .violation-pill {
    display: inline-flex;
    align-items: baseline;
    gap: 0.25rem;
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.2rem 0.45rem;
    background: var(--pill-bg, #f3f4f6);
    color: var(--pill-text, #374151);
    border-radius: 4px;
    cursor: help;
    white-space: nowrap;
    max-width: 100%;
  }

  .violation-pill .pill-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .violation-pill .pill-sep {
    flex-shrink: 0;
    opacity: 0.8;
    font-size: 0.6rem;
  }

  .violation-pill .pill-count {
    flex-shrink: 0;
    font-feature-settings: "tnum";
    font-weight: 700;
  }

  /* Match map tooltip styling (mapboxgl-popup-content) - global for tippy */
  :global(.tippy-box[data-theme~="map-tooltip"]) {
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
    font-size: 0.875rem;
    padding: 0.4rem 0.6rem;
    background: #fff;
    color: #333;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    border-radius: 4px;
  }

  :global(.tippy-box[data-theme~="map-tooltip"] .tippy-arrow) {
    color: #fff;
  }

  :global(.tippy-box[data-theme~="map-tooltip"] .tippy-content) {
    padding: 0;
    max-width: 220px;
  }
</style>
