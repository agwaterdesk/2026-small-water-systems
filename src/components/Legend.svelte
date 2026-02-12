<script>
  let {
    viewLabel = "Value",
    viewColor = "#3498db",
    viewDescription = "",
    extentMin = 0,
    extentMax = 0,
    extentMaxCapped = false,
    isPercent = false,
  } = $props();

  function formatExtent(value) {
    if (isPercent) return value % 1 === 0 ? value : value.toFixed(1);
    return Number(value).toLocaleString();
  }

  const minLabel = $derived(formatExtent(extentMin));
  const maxLabel = $derived(
    formatExtent(extentMax) +
      (isPercent ? "%" : "") +
      (extentMaxCapped && !(isPercent && extentMax >= 100) ? "+" : ""),
  );
</script>

<div class="legend">
  <div class="legend-item scale-legend">
    <span class="scale-label">{viewLabel}</span>
    {#if viewDescription}
      <p class="scale-description">{viewDescription}</p>
    {/if}
    <div
      class="scale-bar"
      style="--legend-color: {viewColor}"
      role="img"
      aria-label="{minLabel} to {maxLabel}"
    ></div>
    <div class="scale-ends">
      <span>{minLabel}{isPercent ? "%" : ""}</span>
      <span>{maxLabel}</span>
    </div>
  </div>
</div>

<style>
  .legend {
    background: #eee;
    padding: 0.5rem;
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
  }

  .scale-label {
    font-weight: 500;
    color: #333 !important;
  }

  .scale-description {
    margin: 0 0 0.25rem 0;
    font-size: 0.875rem;
    font-weight: 400;
    color: #333;
    line-height: 1.45;
  }

  .scale-bar {
    width: 120px;
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(to right, white, var(--legend-color));
  }

  .scale-ends {
    display: flex;
    justify-content: space-between;
    width: 120px;
    font-size: 0.75rem;
    color: #888;
  }
</style>
