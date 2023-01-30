<script lang="ts">
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { API_URL } from "$lib/consts";
  import { authState, extraction } from "$lib/state";
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";

  let loading: boolean;
  let errorMsg: string | null;
  let keyInput: HTMLInputElement;
  onMount(checkKeyValidity);

  async function checkKeyValidity() {
    if (!$authState.key) return;
    loading = true;
    errorMsg = null;
    const response = await fetch(`${API_URL}/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", key: $authState.key }),
    });
    loading = false;

    let json;
    try {
      json = await response.json();
    } catch (e: any) {
      errorMsg = `Failed to verify key (${response.status})`;
      return;
    }

    if (response.ok) {
      $authState.valid = json.valid;
      if (!json.valid) errorMsg = "Key is invalid";
    } else {
      errorMsg = `Failed to verify key (${
        json.message || response.statusText
      })`;
    }
  }

  function onSubmitKey() {
    $authState.key = keyInput.value;
    checkKeyValidity().then(() => {
      if ($authState.valid) goto(base);
    });
  }

  function logout() {
    $authState = { key: null, valid: false };
    $extraction = { stage: "none", totalPages: undefined, filename: undefined };
  }

  const flyDur = 300;
  const flyOut = { y: 50, duration: flyDur };
  const flyIn = { y: -50, duration: flyDur, delay: flyDur };
</script>

<div>
  {#if $authState.valid}
    <form out:fly|local={flyOut} in:fly|local={flyIn} on:submit={logout}>
      <h4>You are authenticated</h4>
      <button type="submit">Logout</button>
    </form>
  {:else}
    <form out:fly|local={flyOut} in:fly|local={flyIn} on:submit={onSubmitKey}>
      <h4>Please authenticate by entering a key</h4>
      <input bind:this={keyInput} type="text" />
      <button type="submit" aria-busy={loading}>Authenticate</button>
    </form>
  {/if}

  {#if errorMsg}
    <h5>{errorMsg}</h5>
  {/if}
</div>

<style>
  form {
    max-width: 500px;
    margin: auto;
  }
</style>
