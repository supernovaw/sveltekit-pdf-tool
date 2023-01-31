<script lang="ts">
  import { checkForOverlap } from "$lib/arrayUtils";
  import { API_URL, ARCHIVE_EXTENSION } from "$lib/consts";
  import { authState, extraction } from "$lib/state";
  import { slide } from "svelte/transition";
  import RangeSelector from "./RangeSelector.svelte";

  $: totalPages = $extraction.totalPages;
  $: totalSelections = $extraction.addedSelections?.length || 0;

  let uploadLoading: boolean = false;
  let uploadError: string | null;
  let removeLoading: boolean = false;
  let sentFileName: string | undefined;
  let extractLoading: boolean = false;
  let extractError: string | null;

  async function onUpload(e: any) {
    const getInput = (name: string) =>
      e.target.querySelector(`[name=${name}]`) as HTMLInputElement;
    const file = getInput("document")?.files?.[0];
    if (!file) {
      alert("Please select a file to upload");
      return;
    }
    if (file.size > 256 * 1024 * 1024) {
      alert("File size limit is 256 megabytes");
      return;
    }
    sentFileName = file.name;

    const formData = new FormData();
    formData.append("document", file);
    formData.append("key", $authState.key!);

    uploadLoading = true;
    fetch(`${API_URL}/upload`, { method: "POST", body: formData })
      .then(onUploadResponse)
      .catch((err) => (uploadError = `Upload failed (${err.message})`))
      .finally(() => (uploadLoading = false));
  }

  async function onUploadResponse(response: Response) {
    const { message, pages } = await response
      .json()
      .catch(() => response.status);
    if (!response.ok) {
      uploadError = `Upload failed (${message || response.status})`;
      return;
    }
    if (typeof pages !== "number") {
      uploadError = `Invalid server response (${typeof pages})`;
      return;
    }
    $extraction = {
      stage: "uploaded",
      totalPages: pages,
      filename: sentFileName,
    };
    selectedPages = [];
    allPages = Array(pages)
      .fill(null)
      .map((_, i) => String(i + 1));
  }

  async function onRemoveFile() {
    removeLoading = true;
    const formData = new FormData();
    formData.append("key", $authState.key!);
    const response = await fetch(`${API_URL}/remove`, {
      method: "POST",
      body: formData,
    }).finally(() => (removeLoading = false));
    const json = await response.json();
    const success = Boolean(json.success);
    if (success) {
      $extraction = { stage: "none" };
    }
  }

  async function onExtract() {
    const formData = new FormData();
    formData.append("key", $authState.key!);
    formData.append(
      "selections",
      formatSelectionForServer($extraction.addedSelections!)
    );
    extractLoading = true;
    extractError = null;
    await fetch(`${API_URL}/extract`, {
      method: "POST",
      body: formData,
    })
      .then(onExtractResponse)
      .catch((err) => (extractError = `Extraction failed (${err.message})`))
      .finally(() => (extractLoading = false));
  }

  async function onExtractResponse(response: Response) {
    const json: any = await response.json();
    if (!response.ok || !json.success) {
      extractError = `Extraction failed (${json.message || response.status})`;
      return;
    }
    $extraction.stage = "processed";
  }

  function formatSelectionForServer(selections: [string, string][]): string {
    // example: "FileA\n1,2,3\nFileB\n6,7,10"
    return selections
      .map(([name, sel]) => name.replace("\n", " ").trim() + "\n" + sel)
      .join("\n");
  }

  // when this value changes, selection in RangeSelector is externally updated
  let selectionController: number = 0;

  function onAddSelection() {
    if (selectedPages.length === totalPages)
      return alert("Every page is selected");
    if (!enteredSelectionName) {
      return alert(
        `Please enter the name of the extracted document ` +
          `(which will have the ${selectedPages.length} page(s) selected)`
      );
    }
    $extraction.addedSelections ||= [];
    const lowercaseName = enteredSelectionName.toLowerCase();
    const duplicateNameFound = $extraction.addedSelections.some(
      ([existingName, _]) => existingName.toLowerCase() === lowercaseName
    );
    if (duplicateNameFound)
      return alert("There already is a selection with the entered name");
    checkOverlaps();

    $extraction.addedSelections.push([
      enteredSelectionName,
      selectedPages.join(","),
    ]);
    $extraction = $extraction; // force store update
    selectedPages = [];
    selectionController = Math.random();
    enteredSelectionName = "";
  }

  function onRemoveSelection(name: string) {
    $extraction.addedSelections = $extraction.addedSelections?.filter(
      ([existingName]) => existingName !== name
    );
  }

  function onAmendSelection(name: string) {
    if ($extraction.addedSelections === undefined) return;
    const index = $extraction.addedSelections.findIndex(([n]) => n === name);

    enteredSelectionName = name;
    selectedPages = $extraction.addedSelections[index][1].split(",");
    selectionController = Math.random();

    $extraction.addedSelections.splice(index, 1);
    $extraction = $extraction;
  }

  function checkOverlaps() {
    if (preventOverlapWarnings === "no") return;
    const overlapsWith = checkForOverlap(
      $extraction.addedSelections || [],
      selectedPages
    );
    if (overlapsWith) {
      preventOverlapWarnings = "auto-yes";
      alert(
        `Note: the added selection overlaps with "${overlapsWith}". ` +
          `You can prevent furter warnings with a button in the bottom.`
      );
    }
  }

  let allPages: string[];
  let selectedPages: string[]; // e.g. ["5", "6"]
  let preventOverlapWarnings: "initial-hidden" | "auto-yes" | "no" =
    "initial-hidden";
  let enteredSelectionName: string = "";

  $: onPageCountChanged(totalPages);
  function onPageCountChanged(totalPages: number = 0) {
    allPages = Array(totalPages)
      .fill(null)
      .map((_, i) => String(i + 1));
    selectedPages = [];
  }

  let downloadFilename: string;
  $: downloadFilename = formatDownloadFilename($extraction.filename);
  function formatDownloadFilename(orig: string | undefined): string {
    if (!orig) return "Extracted" + ARCHIVE_EXTENSION;
    const basename = orig.toLowerCase().endsWith(".pdf")
      ? orig.substring(0, orig.length - ".pdf".length)
      : orig;
    return "Extracted " + basename + ARCHIVE_EXTENSION;
  }
</script>

{#if $extraction.stage === "none"}
  <!-- Step 1 (upload file) -->
  <form on:submit|preventDefault={onUpload}>
    <h4>Step 1: upload document</h4>
    <input name="document" type="file" accept=".pdf" />
    <button type="submit" aria-busy={uploadLoading}>Upload</button>
    {#if uploadError}
      <h5 class="error" transition:slide|local>{uploadError}</h5>
    {/if}
  </form>
{:else if $extraction.stage === "uploaded"}
  <!-- Step 2 (select pages) -->
  <h4>
    Step 1: upload document ({$extraction.filename})
    <button
      on:click={onRemoveFile}
      aria-busy={removeLoading}
      style="width: fit-content; display: inline"
    >
      Remove file
    </button>
  </h4>
  <div style="max-width: 750px; padding-bottom: 200px; margin: auto;">
    <h4 style="margin-bottom: 0">
      Step 2: specify pages to extract<br />(pages for
      {totalSelections} extracted documents specified)
    </h4>
    <div>
      {#if totalSelections > 0}
        <div class="added-selections" transition:slide={{ duration: 150 }}>
          Added {totalSelections} selection(s)
          <ul>
            {#each $extraction.addedSelections || [] as [name, pages] (name)}
              <li transition:slide|local={{ duration: 150 }}>
                <div title={pages}>
                  {name}
                  <span>({pages.split(",").length} pages)</span>
                </div>
                <button
                  on:click={() => onAmendSelection(name)}
                  class="secondary">Amend</button
                >
                <button on:click={() => onRemoveSelection(name)}>Remove</button>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      <RangeSelector
        {totalPages}
        {allPages}
        onSelectionChanged={(p) => (selectedPages = p)}
        externalSelection={selectedPages}
        externalSelectionController={selectionController}
      />
      <form
        class="add-selection-section"
        on:submit|preventDefault={onAddSelection}
      >
        <input
          type="text"
          bind:value={enteredSelectionName}
          placeholder="Name of the extracted {selectedPages.length} page(s)"
          style="background-color: var(--background-color-override)"
        />
        <button style="width: fit-content" disabled={selectedPages.length < 1}>
          Add
        </button>
      </form>
    </div>
    <button
      on:click={onExtract}
      aria-busy={extractLoading}
      disabled={totalSelections === 0}
    >
      Extract {totalSelections} documents
    </button>
    {#if preventOverlapWarnings === "auto-yes"}
      <button
        on:click={() => (preventOverlapWarnings = "no")}
        transition:slide|local
      >
        Do not warn me about overlaps
      </button>
    {/if}
    {#if extractError}
      <h5 class="error" transition:slide|local>{extractError}</h5>
    {/if}
  </div>
{:else if $extraction.stage === "processed"}
  <!-- Step 3 (download) -->
  <h4>Step 1: upload document ({$extraction.filename})</h4>
  <h4>Step 2: specify pages to extract ({totalSelections} output documents)</h4>
  <h4>Step 3: download</h4>
  <a
    role="button"
    style="width: 500px"
    href="{API_URL}/download?key={$authState.key}"
    download={downloadFilename}
    data-sveltekit-preload-data="off"
  >
    Download
  </a>
  <button
    class="center secondary"
    on:click={onRemoveFile}
    aria-busy={removeLoading}
  >
    Start over
  </button>
{/if}

<style>
  form {
    max-width: 500px;
    margin: auto;
  }

  .error {
    color: #c32d4e;
  }

  .center {
    max-width: 500px;
    margin: 8px auto;
  }

  .added-selections {
    margin-top: 16px;
  }

  .added-selections ul {
    margin: auto;
    width: fit-content;
  }

  .added-selections li {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .added-selections li div {
    flex: 1;
    text-align: end;
    margin-inline-end: 4px;
  }

  .added-selections li span {
    opacity: 0.7;
    font-size: 65%;
  }

  .added-selections li button {
    width: fit-content;
    margin-bottom: 0;
    padding: 0px 5px;
    font-size: 75%;
  }

  .add-selection-section {
    gap: 16px;
    display: flex;
    max-width: 750px;
    position: sticky;
    bottom: 0;
    padding-top: 20px;
    padding-bottom: 20px;
    background: linear-gradient(
      to bottom,
      transparent 0,
      var(--background-color) 30px
    );
  }

  .add-selection-section * {
    margin-bottom: 0;
  }
</style>
