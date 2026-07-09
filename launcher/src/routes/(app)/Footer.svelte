<script lang="ts">
	import { Portal, Tooltip } from "@skeletonlabs/skeleton-svelte"
	import { invoke } from "@tauri-apps/api/core"
	import type { ScriptEx } from "$lib/types/collection"
	import { page } from "$app/state"
	import type { Session, SupabaseClient } from "@supabase/supabase-js"
	import type { Database } from "$lib/types/supabase"
	import { fetch } from "@tauri-apps/plugin-http"
	import { RefreshCw, SquaresSubtract } from "@lucide/svelte"
	import { channelManager } from "$lib/communication.svelte"
	import { goto } from "$app/navigation"

	let data = $props()
	let script: ScriptEx = $derived(data.script)
	const supabase: SupabaseClient<Database> = $derived(page.data.supabase)
	const session: Session = $derived(page.data.session)

	function pad(n: number, size: number) {
		let s = n + ""
		while (s.length < size) s = "0" + s
		return s
	}

	async function saveBlobToFile(blob: Blob, path: string, filename: string) {
		const arrayBuffer = await blob.arrayBuffer()
		const data = Array.from(new Uint8Array(arrayBuffer))

		await invoke("save_blob", { path, filename, data })
	}

	async function getVersions(id: string) {
		const { data, error: err } = await supabase
			.schema("scripts")
			.from("versions")
			.select("revision, simba, wasplib, files")
			.eq("id", id)
			.order("revision", { ascending: false })

		if (err) {
			console.error(err)
			return []
		}
		return data
	}

	const versionsPromise = $derived(getVersions(script.id))
	let revision = $state(0)

	async function getNewSessionToken() {
		let result = ""
		try {
			const response = await fetch("https://api.waspscripts.dev/session", {
				method: "GET",
				headers: {
					authorization: "Bearer " + session.access_token,
					refreshtoken: session.refresh_token,
					"Content-Type": "application/json"
				}
			})
			const data = await response.json()
			result = data.refresh_token
		} catch (err) {
			console.error(err)
		}

		return result
	}

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

		const channel = await channelManager.createChannel(script.title)
		const result = await invoke("run_script", { args, channel })
		console.log("run_script: ", result)
		return channel.id
	}

	let client = $state(-1)

	let lazyGithub = import("./Footer/GitHub.svelte")
	let lazyDiscord = import("./Footer/Discord.svelte")
	let lazyYouTube = import("./Footer/YouTube.svelte")

	interface ClientWindow {
		pid: number
		hwnd: number
		name: string
	}
	let clientsPromise = $state(invoke("list_clients") as Promise<ClientWindow[]>)
</script>

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
							>Join the Discord community!</Tooltip.Content
						>
					</Tooltip.Positioner>
				</Portal>
			</Tooltip>
		{/await}
		{#await lazyYouTube then { default: LazyYouTube }}
			<Tooltip positioning={{ placement: "top" }} openDelay={1000}>
				<Tooltip.Trigger>
					<LazyYouTube />
				</Tooltip.Trigger>
				<Portal>
					<Tooltip.Positioner>
						<Tooltip.Content class="card preset-filled p-4">YouTube channel</Tooltip.Content>
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
									{clnt.name}
								</option>
							{/each}
						{/await}
					</select>
				</div>

				<select id="revision" class="select w-44 hover:preset-tonal" bind:value={revision}>
					{#await versionsPromise then versions}
						{#each versions as version, idx}
							<option value={idx}>Revision {version.revision}</option>
						{/each}
					{/await}
				</select>

				<Tooltip positioning={{ placement: "top" }} openDelay={1000}>
					<Tooltip.Trigger>
						<button
							class="hover:preset-filled-primary-800 btn preset-filled-primary-500"
							onclick={async () => {
								const id = await execute()
								await goto("/running/" + id)
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
			{:else}
				<Tooltip positioning={{ placement: "top" }} openDelay={1000}>
					<Tooltip.Trigger class="m-auto">
						<a
							class="btn preset-filled-primary-500 hover:preset-tonal"
							href="https://waspscripts.dev/scripts/{script.id}"
							target="_blank"
						>
							Buy
						</a>
					</Tooltip.Trigger>
					<Portal>
						<Tooltip.Positioner>
							<Tooltip.Content class="card preset-filled p-4">Buy Script</Tooltip.Content>
						</Tooltip.Positioner>
					</Portal>
				</Tooltip>
			{/if}
		</div>
	{/if}
</footer>
