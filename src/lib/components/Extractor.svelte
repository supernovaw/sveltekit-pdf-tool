<script lang="ts">
  import { API_URL } from "$lib/consts";
  import { authState, extraction } from "$lib/state";
  import { slide } from "svelte/transition";
  import RangeSelector from "./RangeSelector.svelte";

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
    const { message, pages } = await response.json();
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
      $extraction = {
        stage: "none",
        filename: undefined,
        totalPages: undefined,
      };
    }
  }

  async function onExtract() {
    if (selectedPages.length === 0) return alert("No pages selected");
    if (selectedPages.length === $extraction.totalPages)
      return alert("Every page is selected");
    const formData = new FormData();
    formData.append("action", "extract");
    formData.append("key", $authState.key!);
    formData.append("pages", selectedPages.join(","));
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

  let allPages: string[];
  let selectedPages: string[];

  $: onPageCountChanged($extraction.totalPages);
  function onPageCountChanged(count: number = 0) {
    allPages = Array(count)
      .fill(null)
      .map((_, i) => String(i + 1));
    selectedPages = [];
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
  <form class="wide" on:submit|preventDefault>
    <h4>
      Step 2: select pages ({selectedPages.length}/{$extraction.totalPages})
    </h4>
    <RangeSelector
      totalPages={$extraction.totalPages}
      {allPages}
      onSelectionChanged={(p) => (selectedPages = p)}
    />
    <button on:click={onExtract} aria-busy={extractLoading}>Extract</button>
    {#if extractError}
      <h5 class="error" transition:slide|local>{extractError}</h5>
    {/if}
  </form>
{:else if $extraction.stage === "processed"}
  <!-- Step 3 (download) -->
  <h4>Step 1: upload document ({$extraction.filename})</h4>
  <h4>Step 2: select pages</h4>
  <h4>Step 3: download</h4>
  <a
    role="button"
    style="width: 500px"
    href="{API_URL}/download?key={$authState.key}"
    download="Extracted-{$extraction.filename}"
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

  form.wide {
    max-width: 750px;
    padding-bottom: 200px;
  }

  .error {
    color: #c32d4e;
  }

  .center {
    max-width: 500px;
    margin: 8px auto;
  }
</style>
