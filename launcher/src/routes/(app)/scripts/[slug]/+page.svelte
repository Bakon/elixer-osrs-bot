<script lang="ts">
	import { mdRenderer } from "$lib/markdown"
	import { replaceScriptContent } from "$lib/utils"
	import ScriptHeader from "./ScriptHeader.svelte"
	let { data } = $props()
	const script = $derived(data.script)!

	// osrs-bot: xp/gp limits lived in the online stats DB; offline they are 0.
	const limits = {
		xp_min: 0,
		xp_max: 0,
		gp_min: 0,
		gp_max: 0
	}

	let content = $derived(replaceScriptContent(script, limits))
</script>

<ScriptHeader
	title={script.title}
	username={script.protected.username}
	description={script.description}
	stage={script.metadata.stage}
>
	<div
		class="mx-auto flex h-40 max-h-60 w-full max-w-140 items-center justify-center rounded-md preset-outlined-surface-500 text-4xl font-bold opacity-40 xl:mx-0"
	>
		{script.title}
	</div>
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
