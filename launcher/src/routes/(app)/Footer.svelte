<script lang="ts">
	import { Portal, Tooltip } from "@skeletonlabs/skeleton-svelte"
	import { invoke } from "@tauri-apps/api/core"
	import type { ScriptEx } from "$lib/types/collection"
	import { RefreshCw, SquaresSubtract } from "@lucide/svelte"
	import { channelManager } from "$lib/communication.svelte"
	import { library } from "$lib/library.svelte"
	import { goto } from "$app/navigation"

	let data = $props()
	let script: ScriptEx = $derived(data.script)

	let runError = $state("")

	async function execute() {
		// osrs-bot OFFLINE MODE: the script is already on disk (staged into
		// Simba/Scripts). Skip every server call — session token, version
		// lookup, storage download — and just run the local file.
		const args = [
			script.url, // path relative to Simba/Scripts, e.g. waspscripts.com/foo.simba
			"local", // Simba version -> use the local Simba build (no download)
			"none", // WaspLib -> use the local Includes copy (no download)
			script.id,
			script.protected.revision.toString(),
			"" // no refresh token offline
		]

		runError = ""
		const clients = await clientsPromise
		const clnt = clients[client]
		const channel = await channelManager.createChannel(
			script.title,
			clnt?.title || clnt?.name || "",
			clnt ?? null,
			args
		)
		try {
			await invoke("run_script", { args, channel })
		} catch (e) {
			// e.g. a different library generation is already running
			await channelManager.stopChannel(channel.id)
			runError = String(e)
			return null
		}
		await library.recordRun(script.id)
		return channel.id
	}

	let client = $state(-1)

	let lazyGithub = import("./Footer/GitHub.svelte")
	let lazyDiscord = import("./Footer/Discord.svelte")

	interface ClientWindow {
		pid: number
		hwnd: number
		name: string
		title: string
	}
	let clientsPromise = $state(invoke("list_clients") as Promise<ClientWindow[]>)
</script>

{#if runError}
	<div class="sticky bottom-16 mx-4 flex items-center justify-between gap-4 rounded-md preset-filled-error-500 px-4 py-2 text-sm">
		<span>{runError}</span>
		<button class="btn-icon hover:preset-tonal" onclick={() => (runError = "")} aria-label="Dismiss">✕</button>
	</div>
{/if}

<footer
	class="sticky bottom-0 flex justify-between bg-surface-200/30 p-4 text-base font-semibold backdrop-blur-md dark:bg-surface-800/30"
>
	<div class="flex gap-2">
		{#await lazyGithub then { default: LazyGithub }}
			<Tooltip positioning={{ placement: "top" }} openDelay={1000}>
				<Tooltip.Trigger>
					<LazyGithub />
				</Tooltip.Trigger>
				<Portal>
					<Tooltip.Positioner>
						<Tooltip.Content class="card preset-filled p-4">Source code</Tooltip.Content>
					</Tooltip.Positioner>
				</Portal>
			</Tooltip>
		{/await}

		{#await lazyDiscord then { default: LazyDiscord }}
			<Tooltip positioning={{ placement: "top" }} openDelay={1000}>
				<Tooltip.Trigger>
					<LazyDiscord />
				</Tooltip.Trigger>
				<Portal>
					<Tooltip.Positioner>
						<Tooltip.Content class="card preset-filled p-4"
							>Add bakonx on Discord (click = copy)</Tooltip.Content
						>
					</Tooltip.Positioner>
				</Portal>
			</Tooltip>
		{/await}
	</div>

	{#if script}
		<div class="flex gap-2">
			{#if script.access}
				<div class="input-group h-8 grid-cols-[auto_1fr_auto]">
					<button
						class="group ig-cell gap-2 hover:preset-tonal"
						onclick={async () => {
							client = -1
							clientsPromise = invoke("list_clients") as Promise<ClientWindow[]>
							await invoke("set_client", {})
						}}
					>
						<span
							class="max-w-0 overflow-hidden whitespace-nowrap opacity-0 duration-300 group-hover:max-w-32 group-hover:opacity-100"
						>
							Refresh clients
						</span>
						<RefreshCw size={16} class="duration-500 group-hover:rotate-180" />
					</button>

					<button
						class="group ig-cell gap-2 enabled:hover:preset-tonal"
						disabled={client < 0}
						onclick={async () => {
							await invoke("show_client")
						}}
					>
						<span
							class="max-w-0 overflow-hidden whitespace-nowrap opacity-0 duration-300
							group-enabled:group-hover:max-w-32 group-enabled:group-hover:opacity-100"
						>
							Show client
						</span>
						<SquaresSubtract size={16} />
					</button>

					<select
						id="client"
						class="select ig-select w-48 rounded-l-none hover:preset-tonal"
						bind:value={client}
						onchange={async () => {
							const clients = await clientsPromise
							await invoke("set_client", { client: clients[client] })
						}}
					>
						<option value={-1} disabled selected>Select a client</option>
						{#await clientsPromise then clients}
							{#each clients as clnt, idx}
								<option value={idx}>
									{clnt.title || clnt.name}
								</option>
							{/each}
						{/await}
					</select>
				</div>

				<Tooltip positioning={{ placement: "top" }} openDelay={1000}>
					<Tooltip.Trigger>
						<button
							class="hover:preset-filled-primary-800 btn preset-filled-primary-500"
							onclick={async () => {
								const id = await execute()
								if (id !== null) await goto("/running/" + id)
							}}
							disabled={client < 0}
						>
							Run
						</button>
					</Tooltip.Trigger>
					<Portal>
						<Tooltip.Positioner>
							<Tooltip.Content class="card preset-filled p-4">Open in Simba</Tooltip.Content>
						</Tooltip.Positioner>
					</Portal>
				</Tooltip>
			{/if}
		</div>
	{/if}
</footer>
