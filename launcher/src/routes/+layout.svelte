<script lang="ts">
	import { onMount } from "svelte"
	import "../app.css"
	import { invalidate } from "$app/navigation"

	let { data, children } = $props()
	const { supabase, session, dark, theme, sidebar, unlisten } = $derived(data)

	let callTimestamps: number[] = []
	onMount(() => {
		document.documentElement.classList.toggle("dark", dark)
		document.body.setAttribute("data-theme", theme)
		document.documentElement.classList.toggle("sidebar", sidebar)

		const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				const now = Date.now()
				callTimestamps = callTimestamps.filter((ts) => now - ts < 10000)
				if (callTimestamps.length >= 10) {
					console.error(
						"Rate limit exceeded: invalidate('root:layout') blocked to prevent loop infinite loop."
					)
					return
				}
				callTimestamps.push(now)
				invalidate("root:layout")
			}
		})

		return () => {
			data.subscription.unsubscribe()
			unlisten()
		}
	})
</script>

{@render children()}
