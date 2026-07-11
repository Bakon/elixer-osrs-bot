<script lang="ts">
	import { goto, invalidate } from "$app/navigation"
	import { channelManager } from "$lib/communication.svelte"
	import { Copy, RotateCcw, SearchIcon, Square, X } from "@lucide/svelte"
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

	// Realtime list of open game clients, so they show up (with RSN) even before
	// a script runs on them.
	let liveClients = $state<{ title: string; name: string }[]>([])
	async function refreshClients() {
		try {
			liveClients = (await invoke("list_clients")) as { title: string; name: string }[]
		} catch {
			/* ignore */
		}
	}
	refreshClients()
	const clientPoll = setInterval(refreshClients, 3000)
	onDestroy(() => clearInterval(clientPoll))

	// Group running/stopped processes by the client (RSN) they run on. Open
	// clients without a script yet still appear (as an empty group).
	const groups = $derived.by(() => {
		const map = new Map<string, { running: number[]; stopped: number[] }>()
		const ensure = (k: string) => {
			if (!map.has(k)) map.set(k, { running: [], stopped: [] })
			return map.get(k)!
		}
		for (const c of liveClients) ensure(c.title || c.name || "Unknown client")
		for (const id of channelManager.processes) {
			const e = channelManager.channels[id]
			if (!e) continue
			const g = ensure(e.clientTitle || "Unknown client")
			if (e.stopped) g.stopped.push(id)
			else g.running.push(id)
		}
		return [...map.entries()].map(([title, v]) => ({ title, ...v }))
	})

	// Re-run a stopped script on the same client it ran on before.
	async function restart(id: number) {
		const e = channelManager.channels[id]
		if (!e) return
		try {
			if (e.client) await invoke("set_client", { client: e.client })
			const ch = await channelManager.createChannel(e.name, e.clientTitle, e.client, e.args)
			await invoke("run_script", { args: e.args, channel: ch })
			channelManager.removeChannel(id)
			await goto("/running/" + ch.id)
		} catch (err) {
			console.error("restart failed:", err)
		}
	}
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
		{#each groups as group}
			<li
				class="mt-3 truncate px-2 text-xs font-semibold text-surface-600-400"
				title={group.title}
			>
				{group.title}
			</li>

			{#each group.running as entry}
				<li
					class="flex items-center preset-outlined-success-200-800 text-sm hover:preset-tonal"
					class:bg-surface-300-700={process === entry}
					class:border-primary-300-700={process === entry}
				>
					<a href={"/running/" + entry} class="my-2 flex h-full w-full items-center gap-2 px-2">
						<span class="size-2 shrink-0 rounded-full bg-success-500"></span>
						<span class="truncate">{channelManager.channels[entry].name}</span>
					</a>
				</li>
			{/each}

			{#each group.stopped as entry}
				<li
					class="flex items-center preset-outlined-surface-200-800 text-surface-700-300 hover:preset-tonal"
					class:bg-surface-300-700={process === entry}
					class:border-primary-300-700={process === entry}
				>
					<a href={"/running/" + entry} class="my-2 flex h-full min-w-0 flex-1 items-center gap-2 px-2">
						<span class="size-2 shrink-0 rounded-full bg-surface-500"></span>
						<span class="truncate">{channelManager.channels[entry].name}</span>
					</a>
					<button
						class="mr-1 rounded p-1 hover:preset-tonal-primary"
						title="Restart this script on the same client"
						onclick={() => restart(entry)}
					>
						<RotateCcw size={14} />
					</button>
				</li>
			{/each}

			{#if group.running.length === 0 && group.stopped.length === 0}
				<li class="px-2 py-1 text-xs text-surface-600-400 italic">no scripts running</li>
			{/if}
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
