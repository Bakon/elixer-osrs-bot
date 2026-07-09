<script lang="ts">
	import ScriptStage from "$lib/components/ScriptStage.svelte"
	import { SearchIcon } from "@lucide/svelte"

	let { data, children } = $props()
	const scripts = $derived(data.scripts)
	let search = $state("")

	function getStyle(access: boolean, type: string, published: boolean) {
		if (!published) {
			return "text-success-500"
		}

		if (type == "premium") {
			if (access) return "text-primary-500 dark:text-primary-500"
			return "text-warning-500"
		}
	}

	let selected = $state(0)
</script>

<aside
	class="flex h-full max-w-96 min-w-44 flex-col gap-2 border-r border-surface-500 p-2 text-sm lg:min-w-64"
>
	<div class="input-group h-9 grid-cols-[auto_1fr_auto]">
		<div class="ig-cell preset-tonal px-2">
			<SearchIcon size={16} />
		</div>
		<input
			type="text"
			placeholder="Search script..."
			class="input ig-input outline-1 outline-surface-300-700 placeholder:text-surface-600-400"
			bind:value={search}
		/>
	</div>

	<ul class="h-full w-full overflow-y-scroll">
		{#each scripts as script, idx}
			<li
				class="flex preset-outlined-success-200-800 hover:preset-tonal focus:preset-tonal"
				class:bg-surface-300-700={selected === idx}
				class:border-primary-300-700={selected === idx}
			>
				<a
					href={script.id}
					class="h-full w-full px-2 {getStyle(
						script.access,
						script.metadata.type,
						script.published
					)} my-2 flex justify-between"
					onclick={() => (selected = idx)}
				>
					{script.title}
					<ScriptStage stage={script.metadata.stage} size={12} styles={"px-1 text-xs lg:text-sm"} />
				</a>
			</li>
		{/each}
	</ul>
</aside>

<div class="mx-2 flex h-full w-full flex-col gap-y-4 overflow-y-auto">
	{@render children()}
</div>
