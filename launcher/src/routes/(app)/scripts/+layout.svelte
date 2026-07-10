<script lang="ts">
	import { SearchIcon } from "@lucide/svelte"
	import Star from "@lucide/svelte/icons/star"
	import Filter from "@lucide/svelte/icons/filter"
	import X from "@lucide/svelte/icons/x"
	import { categorize, CATEGORIES, ORDERED_CATEGORIES } from "$lib/categories"
	import { library } from "$lib/library.svelte"
	import { isUtility } from "$lib/scripts"
	import type { ScriptEx } from "$lib/types/collection"

	let { data, children } = $props()
	const scripts: ScriptEx[] = $derived(data.scripts)

	let search = $state("")
	let filter = $state<"all" | "favorites" | "recent" | "hidden">("all")
	let skillFilter = $state<string | null>(null) // category key, or null = all skills
	let skillOpen = $state(false)

	// Title/category honor the user's local overrides; fall back to the
	// filename-derived title and the inferred skill category.
	function displayTitle(s: ScriptEx) {
		return library.override(s.id).title ?? s.title
	}
	function displayCategory(s: ScriptEx) {
		const ov = library.override(s.id).category
		return (ov && CATEGORIES[ov]) || categorize(s.title, s.url)
	}

	// Which skills actually have scripts, with counts — for the skill picker.
	const skillCounts = $derived.by(() => {
		const counts: Record<string, number> = {}
		for (const s of scripts) {
			if (isUtility(s) || library.isHidden(s.id)) continue
			const key = displayCategory(s).key
			counts[key] = (counts[key] ?? 0) + 1
		}
		return counts
	})

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase()
		let list = scripts.filter((s) => {
			if (isUtility(s)) return false // setup tools live under Settings
			if (filter === "hidden") {
				if (!library.isHidden(s.id)) return false
			} else if (library.isHidden(s.id)) {
				return false
			}
			if (skillFilter && displayCategory(s).key !== skillFilter) return false
			if (!q) return true
			return (
				displayTitle(s).toLowerCase().includes(q) ||
				s.protected.username.toLowerCase().includes(q) ||
				displayCategory(s).name.toLowerCase().includes(q)
			)
		})
		if (filter === "favorites") {
			list = list.filter((s) => library.isFavorite(s.id))
		} else if (filter === "recent") {
			list = list
				.filter((s) => library.recents[s.id])
				.sort((a, b) => library.recents[b.id] - library.recents[a.id])
		} else {
			list = list.sort((a, b) => displayTitle(a).localeCompare(displayTitle(b)))
		}
		return list
	})

	function pickSkill(key: string | null) {
		skillFilter = key
		skillOpen = false
	}
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
		{#if library.hidden.length > 0}
			<button
				class="btn h-7 px-2 text-xs {filter === 'hidden'
					? 'preset-filled-primary-500'
					: 'preset-outlined-surface-500 hover:preset-tonal'}"
				title="Hidden scripts"
				onclick={() => (filter = "hidden")}
			>
				Hidden
			</button>
		{/if}
	</div>

	<!-- Skill filter: expands into an OSRS-order icon grid under the button -->
	<div class="flex flex-col">
		<div class="flex items-center gap-1">
			<button
				class="btn h-8 grow justify-start gap-2 {skillFilter
					? 'preset-filled-primary-500'
					: 'preset-outlined-surface-500 hover:preset-tonal'}"
				onclick={() => (skillOpen = !skillOpen)}
			>
				{#if skillFilter}
					<img src={CATEGORIES[skillFilter].icon} alt="" class="h-4 w-4" />
					<span class="truncate">{CATEGORIES[skillFilter].name}</span>
				{:else}
					<Filter size={14} />
					<span>Filter by skill</span>
				{/if}
			</button>
			{#if skillFilter}
				<button
					class="btn-icon h-8 preset-outlined-surface-500 hover:preset-tonal"
					title="Clear skill filter"
					onclick={() => pickSkill(null)}
				>
					<X size={14} />
				</button>
			{/if}
		</div>

		{#if skillOpen}
			<!-- 3 columns, OSRS panel order — compact: icon only, name/count in tooltip -->
			<div class="mt-1 grid grid-cols-3 gap-0.5 rounded-md preset-outlined-surface-500 p-1">
				{#each ORDERED_CATEGORIES as cat (cat.key)}
					{@const count = skillCounts[cat.key] ?? 0}
					<button
						class="flex items-center justify-center rounded px-2 py-1 disabled:opacity-25 {skillFilter ===
						cat.key
							? 'preset-filled-primary-500'
							: 'hover:preset-tonal'}"
						disabled={count === 0}
						title="{cat.name} ({count})"
						onclick={() => pickSkill(cat.key)}
					>
						<img src={cat.icon} alt={cat.name} class="h-4.5 w-4.5" />
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#snippet row(script: ScriptEx)}
		{@const cat = displayCategory(script)}
		{@const verdict = library.verdicts[script.id]}
		<li class="flex hover:preset-tonal">
			<a
				href={"/scripts/" + script.id}
				class="flex h-full w-full items-center justify-between gap-2 px-2 py-2"
				data-sveltekit-preload-data="false"
			>
				<span class="flex min-w-0 items-center gap-2">
					<img src={cat.icon} alt={cat.name} title={cat.name} class="h-4 w-4 shrink-0" />
					{#if verdict}
						<span
							class="h-2 w-2 shrink-0 rounded-full {verdict === 'works'
								? 'bg-success-500'
								: 'bg-error-500'}"
							title={verdict === "works" ? "Works" : "Broken"}
						></span>
					{/if}
					<span class="truncate">{displayTitle(script)}</span>
				</span>
				<button
					class="shrink-0 hover:text-warning-500 {library.isFavorite(script.id)
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
			</a>
		</li>
	{/snippet}

	<ul class="h-full w-full overflow-y-auto">
		{#each filtered as script (script.id)}
			{@render row(script)}
		{:else}
			<li class="p-4 text-center opacity-60">
				{#if filter === "favorites"}
					No favorites yet — click the ★ next to a script.
				{:else if filter === "recent"}
					Nothing ran yet — recently run scripts show up here.
				{:else if filter === "hidden"}
					No hidden scripts.
				{:else}
					No scripts match your filters.
				{/if}
			</li>
		{/each}
	</ul>
</aside>

<div class="mx-2 flex h-full w-full flex-col gap-y-4 overflow-y-auto">
	{@render children()}
</div>
