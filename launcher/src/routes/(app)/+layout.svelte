<script lang="ts">
	import Navigation from "./Navigation.svelte"
	import Footer from "./Footer.svelte"

	let { data, children } = $props()
</script>

<Navigation />
<main class="flex h-full max-h-full justify-between overflow-y-hidden">
	{@render children()}
</main>
<Footer script={data.script} />
