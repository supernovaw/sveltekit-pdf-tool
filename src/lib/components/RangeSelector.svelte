<script lang="ts">
  import { addToArray, removeFromArray } from "$lib/arrayUtils";
  import { fly } from "svelte/transition";

  export let totalPages: number = 0;
  export let allPages: string[];
  export let onSelectionChanged: (pages: string[]) => void;

  let selectedPages: string[] = [];
  let rangeText: string = "";
  let parseError: string | undefined;
  let parsedNumbers: string[] | undefined;

  function onAdd() {
    if (!parsedNumbers) return;
    selectedPages = addToArray(selectedPages, parsedNumbers);
    onSelectionChanged(selectedPages);
  }

  function onRemove() {
    if (!parsedNumbers) return;
    selectedPages = removeFromArray(selectedPages, parsedNumbers);
    onSelectionChanged(selectedPages);
  }

  $: parsedNumbers = parseRanges(rangeText);
  function parseRanges(range: string) {
    if (!range) {
      parseError = undefined;
      return;
    }
    const result: string[] = [];
    const add = (n: string) => !result.includes(n) && result.push(n);
    const split = range.trim().split(/ *[,;] */);

    // Returns error message or void
    const checkNumber = (s: string): string | undefined => {
      if (!s.match(/^\d+$/)) return `invalid page number ${s}`;
      const n = +s;
      if (n < 1 || n > totalPages)
        return `page number ${n} is out of range 1-${totalPages}`;
    };

    for (const range of split) {
      if (!range) continue;
      const rangeBounds: string[] = range
        .split(/ *- */)
        .map((str) =>
          str.toLowerCase() === "last" ? totalPages.toString() : str
        );

      if (rangeBounds.length === 1) {
        const [num] = rangeBounds;
        if (num === "") return;
        if ((parseError = checkNumber(num))) return;
        add(num);
      } else if (rangeBounds.length === 2) {
        const [start, end] = rangeBounds;
        if (start === "" || end === "") return;
        if ((parseError = checkNumber(start))) return;
        if ((parseError = checkNumber(end))) return;
        const numStart = +start;
        const numEnd = +end;
        if (numStart > numEnd) {
          parseError = `invalid range order: ${range}`;
          return;
        }
        for (let i = numStart; i <= numEnd; i++) add(i.toString());
      } else {
        parseError = `invalid range: "${range}"`;
        return;
      }
    }
    return result;
  }
</script>

<div class="range">
  {#if parseError}
    <div class="parse-error" transition:fly={{ y: 10, duration: 200 }}>
      {parseError}
    </div>
  {/if}
  <input
    type="text"
    bind:value={rangeText}
    aria-invalid={parsedNumbers ? false : parseError ? true : undefined}
    placeholder="Type ranges, e.g. 5, 7-10, 12-15, 18, 20-last"
  />
  <div>
    <button class="secondary" on:click={onAdd}>Add</button>
    <button class="secondary" on:click={onRemove}>Remove</button>
    <button class="secondary" on:click={() => (rangeText = "1-last")}>
      All
    </button>
  </div>
</div>
<div class="page-checkboxes">
  {#each allPages as pageNumber}
    <label>
      <input
        type="checkbox"
        value={pageNumber}
        bind:group={selectedPages}
        on:change={() => onSelectionChanged(selectedPages)}
      />
      {pageNumber}
    </label>
  {/each}
</div>

<style>
  .parse-error {
    font-size: 80%;
    position: absolute;
    top: calc(100% - 12px);
    pointer-events: none;
    background-color: var(--form-element-background-color);
    border: 1px solid var(--form-element-border-color);
    border-radius: 0.5em;
    padding: 0.25em 0.5em;
    box-shadow: 0 1px 5px #111;
  }

  .range {
    position: sticky;
    display: flex;
    flex-wrap: wrap;
    column-gap: 8px;
    top: 0;
    padding-top: 20px;
    background: linear-gradient(to top, transparent 0, var(--background-color) 30px)
  }

  .range div {
    display: flex;
    column-gap: 4px;
  }

  .range input {
    min-width: 300px;
    flex: 1;
  }

  .range button {
    flex: 0;
    min-width: fit-content;
  }

  .page-checkboxes {
    display: flex;
    flex-wrap: wrap;
    padding-top: 15px;
    padding-inline: 35px 15px;
    padding-bottom: 16px;
  }

  .page-checkboxes label {
    flex-basis: 70px;
    text-align: start;
    font-size: 70%;
  }

  .page-checkboxes input {
    margin-inline-end: 0;
  }
</style>
