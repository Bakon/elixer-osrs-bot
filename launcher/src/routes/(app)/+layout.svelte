<script lang="ts">
	import Navigation from "./Navigation.svelte"
	import Footer from "./Footer.svelte"

	let { data, children } = $props()
</script>

<Navigation />
<main class="flex min-h-0 flex-1 justify-between overflow-hidden pt-4">
	{@render children()}
</main>
<Footer script={data.script} />
