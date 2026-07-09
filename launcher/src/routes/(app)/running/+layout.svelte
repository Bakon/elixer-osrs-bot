<script lang="ts">
	import { goto, invalidate } from "$app/navigation"
	import { channelManager } from "$lib/communication.svelte"
	import { Copy, SearchIcon, Square, X } from "@lucide/svelte"
	import { invoke } from "@tauri-apps/api/core"
	import { onDestroy } from "svelte"

	let { children, data } = $props()

	const { process, channel } = $derived(data)
	let search = $state("")

	const [stopped, running] = $derived(
		channelManager.processes.reduce<[number[], number[]]>(
			(acc, idx) => {
				channelManager.channels[idx]?.stopped ? acc[0].push(idx) : acc[1].push(idx)
				return acc
			},
			[[], []]
		)
	)

	const selected = $derived.by(() => {
		const i = running.indexOf(process)
		if (i > -1) return i
		const idx = stopped.indexOf(process)
		if (idx == -1) return 0
		return idx + running.length
	})

	const hasProcesses = $derived(running.length > 0 || stopped.length > 0)

	function getRuntime(start: number, finish: number): string {
		const time = finish - start

		const totalSeconds = Math.floor(time / 1000)

		const hours = Math.floor(totalSeconds / 3600)
		const minutes = Math.floor((totalSeconds % 3600) / 60)
		const seconds = totalSeconds % 60

		return `${hours.toString().padStart(2, "0")}:${minutes
			.toString()
			.padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
	}

	let runtime = $state("00:00:00")

	const runtimeInterval = setInterval(() => {
		if (!channel) {
			clearInterval(runtimeInterval)
			return
		}
		if (channel.stopped) runtime = getRuntime(channel.start, channel.finish)
		else runtime = getRuntime(channel.start, Date.now())
	}, 1000)

	onDestroy(() => clearInterval(runtimeInterval))
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
		{#each running as entry, idx}
			<li
				class="flex preset-outlined-success-200-800 text-sm hover:preset-tonal focus:preset-tonal"
				class:bg-surface-300-700={selected === idx}
				class:border-primary-300-700={selected === idx}
			>
				<a href={"/running/" + entry} class="my-2 flex h-full w-full justify-between px-2">
					{channelManager.channels[entry].name}
				</a>
			</li>
		{/each}

		{#each stopped as entry, idx}
			<li
				class="flex preset-outlined-success-200-800 text-surface-700-300 hover:preset-tonal hover:text-surface-800-200 focus:preset-tonal"
				class:bg-surface-300-700={selected === idx + running.length}
				class:border-primary-300-700={selected === idx + running.length}
			>
				<a href={"/running/" + entry} class="my-2 flex h-full w-full justify-between px-2">
					{channelManager.channels[entry].name}
				</a>
			</li>
		{/each}
	</ul>
</aside>

<main class="flex h-full w-full overflow-y-auto">
	<div class="relative flex h-full w-full flex-col overflow-hidden">
		{#if hasProcesses}
			<div class="absolute right-0 mx-4 flex justify-end gap-2 p-4">
				<div class="rounded-lg border border-surface-500 bg-surface-500/65 p-2">
					{runtime}
				</div>
				<button
					class="btn btn-group rounded-lg border border-surface-500 bg-surface-500/65 p-2"
					onclick={async () => {
						if (!channel) return
						const data = channelManager.getLogs(process)
						const lines = data.map((log) => {
							if (log.close) return log.text + "\n"
							return log.text + " "
						})
						await navigator.clipboard.writeText(lines.join(""))
					}}
				>
					<span> Copy </span>
					<Copy size={16} />
				</button>
				{#if selected < running.length}
					<button
						class="btn btn-group flex gap-2 rounded-lg border border-surface-500 bg-surface-500/70 p-2"
						onclick={async () => {
							const result = await invoke("kill_script", { id: running[selected] })
							console.log("kill_script: ", result)
						}}
					>
						<span> Stop </span>
						<Square size={16} />
					</button>
				{:else}
					<button
						class="btn rounded-lg border border-surface-500 bg-surface-500/70 p-2"
						onclick={async () => {
							channelManager.removeChannel(stopped[selected - running.length])
							await Promise.all([invalidate("layout:channel"), invalidate("layout:running")])
							await goto("/running")
						}}
					>
						<span> Close </span>
						<X size={16} />
					</button>
				{/if}
			</div>
		{/if}

		<div
			id="running-container"
			class="block min-h-full w-full min-w-fit gap-2 px-4 text-left wrap-break-word whitespace-break-spaces"
			class:bg-stone-950={hasProcesses}
			class:overflow-y-scroll={hasProcesses}
		>
			{@render children()}
		</div>
	</div>
</main>
