<script lang="ts">
  import { base } from "$app/paths";
  import { page } from "$app/stores";
  import { fly } from "svelte/transition";
</script>

<nav>
  <ul>
    <li><a href={base}>Home</a></li>
    <li><a href="{base}/authenticate">Authenticate</a></li>
  </ul>
</nav>

{#key $page.url}
  <main in:fly={{ y: -15, duration: 250 }}>
    <slot />
  </main>
{/key}

<style>
  nav {
    display: flex;
    justify-content: flex-end;
    padding-inline-end: 16px;
    overflow: hidden;
  }

  main {
    padding: 32px;
    text-align: center;
  }
</style>
