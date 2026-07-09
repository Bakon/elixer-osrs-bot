<script lang="ts">
	import Navigation from "./Navigation.svelte"
	import Footer from "./Footer.svelte"
	import Sidebar from "./Sidebar.svelte"

	let { data, children } = $props()
</script>

<Navigation />
<main class="flex h-full max-h-full justify-between overflow-y-hidden">
	{@render children()}
	<Sidebar />
</main>
<Footer script={data.script} />
