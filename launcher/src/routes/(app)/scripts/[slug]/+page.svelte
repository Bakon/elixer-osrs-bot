<script lang="ts">
	import { mdRenderer } from "$lib/markdown"
	import { DATABASE_URL } from "$lib/supabase"
	import { replaceScriptContent } from "$lib/utils"
	import ScriptHeader from "./ScriptHeader.svelte"
	let { data } = $props()
	const script = $derived(data.script)!

	let limits = $state({
		xp_min: 0,
		xp_max: 0,
		gp_min: 0,
		gp_max: 0
	})

	async function getLimits() {
		const { data: limitsData, error: err } = await data.supabase
			.schema("stats")
			.from("limits")
			.select("xp_min, xp_max, gp_min, gp_max")
			.eq("id", script.id)
			.single()
		if (err) {
			console.error(err)
			return
		}
		limits = limitsData
	}

	getLimits()

	let content = $derived(replaceScriptContent(script, limits))
</script>

<ScriptHeader
	title={script.title}
	username={script.protected.username}
	description={script.description}
	stage={script.metadata.stage}
>
	<img
		class="mx-auto h-auto max-h-60 w-full max-w-140 rounded-md xl:mx-0 xl:w-auto xl:max-w-full"
		src={DATABASE_URL + "storage/v1/object/public/imgs/scripts/" + script.id + "/banner.jpg"}
		alt="Script banner"
		loading="eager"
	/>
</ScriptHeader>

<div
	class="flex h-full w-full flex-col overflow-y-scroll rounded-md preset-outlined-surface-500 p-8"
>
	{#if !script.published}
		<small class="text-center text-xs text-warning-500">
			This script is not published and not visible for everyone!
		</small>
	{/if}

	<article class="my-4 prose dark:prose-invert">
		{@html mdRenderer.render(content)}
	</article>
</div>
