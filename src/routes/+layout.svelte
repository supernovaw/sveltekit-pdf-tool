<script lang="ts">
  import { base } from "$app/paths";
</script>

<nav>
  <ul>
    <li><a href="{base}">Home</a></li>
  </ul>
</nav>
<main>
  <slot />
</main>

<style>
  nav {
    display: flex;
    justify-content: flex-end;
    overflow: hidden;
  }

  a {
    padding-inline: 16px;
    margin-inline: 0;
  }

  main {
    padding: 32px;
    text-align: center;
  }
</style>
