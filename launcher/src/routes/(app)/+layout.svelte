<script lang="ts">
	import Navigation from "./Navigation.svelte"
	import Footer from "./Footer.svelte"

	let { data, children } = $props()
</script>

<!-- Self-contained viewport-height flex column: don't rely on flex/% sizing
	 propagating through the body's display:contents wrapper (WebView2 miscomputes
	 it, which let the whole page scroll instead of just the inner panel). -->
<div class="fixed inset-0 flex flex-col overflow-clip">
	<div class="shrink-0">
		<Navigation />
	</div>
	<main class="flex min-h-0 flex-1 justify-between overflow-clip pt-4">
		{@render children()}
	</main>
	<div class="shrink-0">
		<Footer script={data.script} />
	</div>
</div>
