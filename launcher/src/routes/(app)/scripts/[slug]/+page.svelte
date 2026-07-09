<script lang="ts">
	import { mdRenderer } from "$lib/markdown"
	import { replaceScriptContent } from "$lib/utils"
	import { categorize } from "$lib/categories"
	import { library } from "$lib/library.svelte"
	import ScriptHeader from "./ScriptHeader.svelte"
	import Star from "@lucide/svelte/icons/star"
	import ThumbsUp from "@lucide/svelte/icons/thumbs-up"
	import ThumbsDown from "@lucide/svelte/icons/thumbs-down"
	let { data } = $props()
	const script = $derived(data.script)!

	const cat = $derived(categorize(script.title, script.url))
	const verdict = $derived(library.verdicts[script.id])
	const favorite = $derived(library.isFavorite(script.id))

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
		class="mx-auto flex h-40 max-h-60 w-full max-w-140 flex-col items-center justify-center gap-3 rounded-md preset-outlined-surface-500 xl:mx-0"
	>
		<span class="flex items-center gap-3 text-3xl font-bold opacity-40">
			<cat.icon size={30} />
			{script.title}
		</span>
		<span class="text-sm opacity-50">{cat.name}</span>
	</div>
</ScriptHeader>

<div class="flex items-center justify-center gap-2 xl:justify-start">
	<button
		class="btn h-9 gap-2 {favorite
			? 'preset-filled-warning-500'
			: 'preset-outlined-surface-500 hover:border-warning-500'}"
		onclick={async () => await library.toggleFavorite(script.id)}
	>
		<Star size={16} fill={favorite ? "currentColor" : "none"} />
		{favorite ? "Favorited" : "Favorite"}
	</button>

	<button
		class="btn h-9 gap-2 {verdict === 'works'
			? 'preset-filled-success-500'
			: 'preset-outlined-surface-500 hover:border-success-500'}"
		title="Mark this script as working"
		onclick={async () => await library.setVerdict(script.id, "works")}
	>
		<ThumbsUp size={16} />
		Works
	</button>

	<button
		class="btn h-9 gap-2 {verdict === 'broken'
			? 'preset-filled-error-500'
			: 'preset-outlined-surface-500 hover:border-error-500'}"
		title="Mark this script as broken"
		onclick={async () => await library.setVerdict(script.id, "broken")}
	>
		<ThumbsDown size={16} />
		Broken
	</button>
</div>

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
