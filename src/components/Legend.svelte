<script>
  let {
    viewLabel = "Value",
    viewColor = "#3498db",
    viewDescription = "",
    extentMin = 0,
    extentMax = 0,
    extentMaxCapped = false,
    isPercent = false,
    isRate = false,
    showRateToggle = false,
    useRateMode = $bindable(true),
  } = $props();

  function formatExtent(value) {
    if (isPercent) return value % 1 === 0 ? value : value.toFixed(1);
    if (isRate) return value % 1 === 0 ? value : value.toFixed(2);
    return Number(value).toLocaleString();
  }

  const displayLabel = $derived(
    isRate ? `${viewLabel} (per 1k people served)` : viewLabel,
  );

  const extentSuffix = $derived(isPercent ? "%" : isRate ? "" : "");
  const minLabel = $derived(formatExtent(extentMin) + extentSuffix);
  const maxLabel = $derived(
    formatExtent(extentMax) +
      (isPercent ? "%" : "") +
      (extentMaxCapped && !(isPercent && extentMax >= 100) ? "+" : ""),
  );
</script>

<div class="legend">
  <div class="legend-row">
    <span class="scale-label">{displayLabel}</span>
  </div>
  <div class="legend-row">
    {#if viewDescription}
      <p class="scale-description">{viewDescription}</p>
    {/if}
  </div>
  <div class="legend-row">
    <div class="legend-item scale-legend">
      <div
        class="scale-bar"
        style="--legend-color: {viewColor}"
        role="img"
        aria-label="{minLabel} to {maxLabel}"
      ></div>
      <div class="scale-ends">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
    {#if showRateToggle}
      <div
        class="rate-toggle"
        role="group"
        aria-label="Display as rate or count"
      >
        <button
          type="button"
          class="toggle-btn"
          class:active={useRateMode}
          onclick={() => (useRateMode = true)}
          aria-pressed={useRateMode}
        >
          Per 1k
        </button>
        <button
          type="button"
          class="toggle-btn"
          class:active={!useRateMode}
          onclick={() => (useRateMode = false)}
          aria-pressed={!useRateMode}
        >
          Count
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .legend {
    background: #eee;
    padding: 0.5rem;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .legend-row {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 1rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .legend-item span {
    font-size: 0.875rem;
    color: #656568;
  }

  .scale-legend {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .scale-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #333;
  }

  .scale-description {
    margin: 0 0 0.25rem 0;
    font-size: 0.875rem;
    font-weight: 400;
    color: #333;
    line-height: 1.45;
  }

  .scale-bar {
    width: 200px;
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(to right, white, var(--legend-color));
  }

  .scale-ends {
    display: flex;
    justify-content: space-between;
    width: 200px;
    font-size: 0.75rem;
    color: #888;
  }

  .rate-toggle {
    display: inline-flex;
    border: 1px solid #ccc;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .toggle-btn {
    padding: 0.2rem 0.5rem;
    font-size: 0.75rem;
    font-family: inherit;
    color: #666;
    background: #fff;
    border: none;
    border-right: 1px solid #ccc;
    cursor: pointer;
    transition:
      background 0.15s ease,
      color 0.15s ease;
  }

  .toggle-btn:last-child {
    border-right: none;
  }

  .toggle-btn:hover {
    background: #f5f5f5;
    color: #333;
  }

  .toggle-btn.active {
    background: #e8e8e8;
    color: #333;
    font-weight: 500;
  }

  .toggle-btn:focus-visible {
    outline: 2px solid #3498db;
    outline-offset: -2px;
    z-index: 1;
  }
</style>
