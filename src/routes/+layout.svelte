<script lang="ts">
  import { base } from "$app/paths";
</script>

<nav>
  <ul>
    <li><a href={base}>Home</a></li>
    <li><a href="{base}/authenticate">Authenticate</a></li>
  </ul>
</nav>
<main>
  <slot />
</main>

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
