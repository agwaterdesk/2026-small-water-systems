<script>
  /**
   * Shared dropdown control - keyboard accessible, mobile friendly.
   * Supports select mode (button trigger) or search mode (input trigger).
   */
  let {
    id = "",
    label = "",
    mode = "select", // "select" | "search"
    // select mode
    options = [],
    value = "",
    onSelect = () => {},
    // search mode
    searchQuery = "",
    onSearchChange = () => {},
    searchResults = [],
    getOptionLabel = (opt) => opt?.label ?? "",
    getOptionValue = (opt) => opt?.value ?? opt,
    placeholder = "Type to search...",
    onSelectResult = () => {},
  } = $props();

  let open = $state(false);
  let highlightedIndex = $state(-1);
  let triggerEl = $state(null);
  let listEl = $state(null);

  const items = $derived(mode === "select" ? options : searchResults);
  const filteredItems = $derived(items.slice(0, 12));
  const hasItems = $derived(filteredItems.length > 0);
  const showDropdown = $derived(open && (mode === "select" ? true : hasItems));
  const displayValue = $derived(
    mode === "select"
      ? options.find((o) => (o.value ?? o) === value)?.label ?? ""
      : searchQuery
  );

  function handleTriggerClick() {
    open = !open;
    highlightedIndex = -1;
    if (open && mode === "search") triggerEl?.focus();
  }

  function handleSelect(opt) {
    if (mode === "select") {
      const v = opt.value ?? opt;
      onSelect?.(v);
      open = false;
    } else {
      onSelectResult?.(opt);
      open = false;
    }
  }

  function handleKeydown(e) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        open = true;
        highlightedIndex = 0;
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      open = false;
      highlightedIndex = -1;
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, filteredItems.length - 1);
      listEl?.children[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
      listEl?.children[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[highlightedIndex]);
    }
  }

  function handleClickOutside(e) {
    if (triggerEl && !triggerEl.contains(e.target) && listEl && !listEl.contains(e.target)) {
      open = false;
    }
  }

  $effect(() => {
    if (!open) return;
    const fn = handleClickOutside;
    document.addEventListener("click", fn, true);
    return () => document.removeEventListener("click", fn, true);
  });

  $effect(() => {
    if (!open) highlightedIndex = -1;
  });
</script>

<div class="control-wrap" role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-controls={id ? `${id}-listbox` : undefined}>
  <label for={id ? `${id}-trigger` : undefined} class="control-label">{label}</label>
  <div class="trigger-row">
    {#if mode === "select"}
      <button
        id={id ? `${id}-trigger` : undefined}
        type="button"
        class="control-trigger"
        bind:this={triggerEl}
        onclick={handleTriggerClick}
        onkeydown={handleKeydown}
        aria-label={label}
        aria-expanded={open}
      >
        {#if (options.find((o) => (o.value ?? o) === value)?.color)}
          <span
            class="trigger-swatch"
            style="background: {options.find((o) => (o.value ?? o) === value)?.color ?? '#999'}"
            aria-hidden="true"
          ></span>
        {/if}
        <span class="trigger-value">{displayValue || "Select..."}</span>
        <span class="trigger-arrow" aria-hidden="true">▼</span>
      </button>
    {:else}
      <input
        id={id ? `${id}-trigger` : undefined}
        type="text"
        class="control-trigger control-input"
        value={searchQuery}
        bind:this={triggerEl}
        placeholder={placeholder}
        onfocus={() => (open = true)}
        onkeydown={handleKeydown}
        oninput={(e) => onSearchChange?.(e.currentTarget.value)}
        aria-label={label}
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={id ? `${id}-listbox` : undefined}
        role="combobox"
      />
    {/if}
  </div>
  {#if showDropdown}
    <ul
      id={id ? `${id}-listbox` : undefined}
      class="control-dropdown"
      role="listbox"
      bind:this={listEl}
    >
      {#each filteredItems as opt, i (getOptionValue(opt))}
        <li
          role="option"
          tabindex="-1"
          aria-selected={mode === "select" ? getOptionValue(opt) === value : false}
          class="control-option"
          class:highlighted={i === highlightedIndex}
          class:selected={mode === "select" && getOptionValue(opt) === value}
          onclick={() => handleSelect(opt)}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleSelect(opt);
            }
          }}
          onmouseenter={() => (highlightedIndex = i)}
        >
          {#if mode === "select"}
            <span class="option-check" aria-hidden="true"
              >{getOptionValue(opt) === value ? "✓" : ""}</span
            >
            {#if opt.color}
              <span class="option-swatch" style="background: {opt.color}" aria-hidden="true"></span>
            {/if}
            <span class="option-text">{opt.label ?? opt}</span>
          {:else}
            {getOptionLabel(opt)}
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style lang="scss">
  .control-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 160px;
  }

  .control-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #333;
  }

  .trigger-row {
    position: relative;
  }

  .control-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-width: 230px;
    min-height: 2.5rem;
    padding: 0.4rem 0.6rem;
    font-size: 0.875rem;
    font-family: inherit;
    color: #333;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
  }

  .control-trigger:hover,
  .control-trigger:focus {
    border-color: #999;
    outline: 2px solid #3498db;
    outline-offset: 2px;
  }

  .control-input {
    cursor: text;
  }

  .trigger-value {
    flex: 1;
    text-align: left;
  }

  .trigger-swatch {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
    margin-right: 0.4rem;
  }

  .trigger-arrow {
    font-size: 0.6rem;
    opacity: 0.6;
    margin-left: 0.5rem;
  }

  .control-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin: 0.25rem 0 0 0;
    padding: 0;
    list-style: none;
    background: #fff;
    color: #333;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    max-height: 240px;
    overflow-y: auto;
    z-index: 50;

    li {
      border-bottom: none;
    }
  }

  .control-option {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    cursor: pointer;
    min-height: 2.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &:hover,
    &.highlighted {
      background: #e8e8e8;
    }

    &:last-child {
      border-radius: 0 0 4px 4px;
    }

    &:first-child {
      border-radius: 4px 4px 0 0;
    }
  }

  .option-check {
    width: 1rem;
    flex-shrink: 0;
  }

  .option-text {
    flex: 1;
  }

  .option-swatch {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
    margin-right: 0.4rem;
  }
</style>
