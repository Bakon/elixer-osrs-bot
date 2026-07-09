<script lang="ts">
	import { SearchIcon } from "@lucide/svelte"
	import Star from "@lucide/svelte/icons/star"
	import { categorize } from "$lib/categories"
	import { library } from "$lib/library.svelte"
	import type { ScriptEx } from "$lib/types/collection"

	let { data, children } = $props()
	const scripts: ScriptEx[] = $derived(data.scripts)

	let search = $state("")
	let filter = $state<"all" | "favorites" | "recent">("all")

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase()
		let list = scripts.filter((s) => {
			if (!q) return true
			const cat = categorize(s.title, s.url)
			return (
				s.title.toLowerCase().includes(q) ||
				s.protected.username.toLowerCase().includes(q) ||
				cat.name.toLowerCase().includes(q)
			)
		})
		if (filter === "favorites") {
			list = list.filter((s) => library.isFavorite(s.id))
		} else if (filter === "recent") {
			list = list
				.filter((s) => library.recents[s.id])
				.sort((a, b) => library.recents[b.id] - library.recents[a.id])
		}
		return list
	})
</script>

<aside
	class="flex h-full w-80 min-w-52 resize-x flex-col gap-2 overflow-x-auto border-r border-surface-500 p-2 text-sm"
	style="max-width: 50vw"
>
	<div class="input-group h-9 grid-cols-[auto_1fr_auto]">
		<div class="ig-cell preset-tonal px-2">
			<SearchIcon size={16} />
		</div>
		<input
			type="text"
			placeholder="Search script, author or skill..."
			class="input ig-input outline-1 outline-surface-300-700 placeholder:text-surface-600-400"
			bind:value={search}
		/>
	</div>

	<div class="flex gap-1">
		<button
			class="btn h-7 grow px-2 text-xs {filter === 'all'
				? 'preset-filled-primary-500'
				: 'preset-outlined-surface-500 hover:preset-tonal'}"
			onclick={() => (filter = "all")}
		>
			All
		</button>
		<button
			class="btn h-7 grow px-2 text-xs {filter === 'favorites'
				? 'preset-filled-primary-500'
				: 'preset-outlined-surface-500 hover:preset-tonal'}"
			onclick={() => (filter = "favorites")}
		>
			★ Favorites
		</button>
		<button
			class="btn h-7 grow px-2 text-xs {filter === 'recent'
				? 'preset-filled-primary-500'
				: 'preset-outlined-surface-500 hover:preset-tonal'}"
			onclick={() => (filter = "recent")}
		>
			Recent
		</button>
	</div>

	<ul class="h-full w-full overflow-y-auto">
		{#each filtered as script (script.id)}
			{@const cat = categorize(script.title, script.url)}
			{@const verdict = library.verdicts[script.id]}
			<li class="flex hover:preset-tonal">
				<a
					href={"/scripts/" + script.id}
					class="flex h-full w-full items-center justify-between gap-2 px-2 py-2"
					data-sveltekit-preload-data="false"
				>
					<span class="flex min-w-0 items-center gap-2">
						{#if verdict}
							<span
								class="h-2 w-2 shrink-0 rounded-full {verdict === 'works'
									? 'bg-success-500'
									: 'bg-error-500'}"
								title={verdict === "works" ? "Works" : "Broken"}
							></span>
						{/if}
						<span class="truncate">{script.title}</span>
					</span>
					<span class="flex shrink-0 items-center gap-2 opacity-70">
						<cat.icon size={14} aria-label={cat.name} />
						<button
							class="hover:text-warning-500 {library.isFavorite(script.id)
								? 'text-warning-500'
								: 'opacity-40'}"
							title={library.isFavorite(script.id) ? "Unfavorite" : "Favorite"}
							onclick={async (e) => {
								e.preventDefault()
								e.stopPropagation()
								await library.toggleFavorite(script.id)
							}}
						>
							<Star size={14} fill={library.isFavorite(script.id) ? "currentColor" : "none"} />
						</button>
					</span>
				</a>
			</li>
		{:else}
			<li class="p-4 text-center opacity-60">
				{#if filter === "favorites"}
					No favorites yet — click the ★ next to a script.
				{:else if filter === "recent"}
					Nothing ran yet — recently run scripts show up here.
				{:else}
					No scripts match "{search}".
				{/if}
			</li>
		{/each}
	</ul>
</aside>

<div class="mx-2 flex h-full w-full flex-col gap-y-4 overflow-y-auto">
	{@render children()}
</div>
