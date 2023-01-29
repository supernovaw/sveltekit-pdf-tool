<script lang="ts">
  import Extractor from "$lib/components/Extractor.svelte";
  import { authState } from "$lib/state";
</script>

{#if $authState.valid}
  <Extractor />
{:else}
  <h4>Please authenticate to use this service</h4>
{/if}
