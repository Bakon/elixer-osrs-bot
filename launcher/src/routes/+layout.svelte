<script lang="ts">
	import { onMount } from "svelte"
	import "../app.css"

	let { data, children } = $props()
	const { dark, theme, sidebar, unlisten } = $derived(data)

	onMount(() => {
		document.documentElement.classList.toggle("dark", dark)
		document.body.setAttribute("data-theme", theme)
		document.documentElement.classList.toggle("sidebar", sidebar)

		return () => {
			unlisten()
		}
	})
</script>

{@render children()}
