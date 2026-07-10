<script lang="ts">
	import { page } from "$app/state"
	import { invoke } from "@tauri-apps/api/core"
	import { getVersion } from "@tauri-apps/api/app"
	import { openPath } from "@tauri-apps/plugin-opener"
	import { Switch } from "@skeletonlabs/skeleton-svelte"
	import { onMount } from "svelte"

	const { settings } = $derived(page.data)
	const simbaPath: string = $derived(page.data.simbaPath)

	// --- Bot (shared WaspLib config: Configs/wasplib.json) -----------------
	let remoteInput = $state(false)
	onMount(async () => {
		try {
			const cfg = (await invoke("get_wasplib_config")) as any
			remoteInput = cfg?.remote_input?.enabled ?? false
		} catch (e) {
			console.error(e)
		}
	})
	async function toggleRemoteInput(value: boolean) {
		remoteInput = value
		await invoke("set_wasplib_bool", { section: "remote_input", key: "enabled", value })
	}

	// --- Appearance ------------------------------------------------------
	// "elixer" is the cerberus Skeleton theme, rebranded (and the default).
	const themesData = [
		{ label: "Elixer", value: "cerberus" },
		{ label: "Concord", value: "concord" },
		{ label: "Fennec", value: "fennec" },
		{ label: "Wasp", value: "wasp" }
	]

	// svelte-ignore state_referenced_locally
	let dark = $state(page.data.dark) as boolean
	// svelte-ignore state_referenced_locally
	let theme = $state(page.data.theme) as string

	async function toggleDarkMode(state: boolean) {
		dark = state
		document.documentElement.classList.toggle("dark", dark)
		await settings.set("dark", dark)
	}

	async function updateTheme(value: string) {
		theme = value
		document.body.setAttribute("data-theme", theme)
		await settings.set("theme", theme)
	}

	// --- Simba -------------------------------------------------------------
	async function openSimba() {
		// osrs-bot OFFLINE MODE: "latest"/"none" skip every download path.
		await invoke("run_executable", { exe: "simba", args: ["", "latest", "none", "", "", ""] })
	}

	// --- Maintenance ------------------------------------------------------
	let busy = $state("")
	async function clear(what: "cache" | "assets" | "configs") {
		busy = what
		await invoke("delete_" + what, { exe: "simba" })
		busy = ""
	}

	// --- Tools -------------------------------------------------------------
	// Setup utilities (not bots) — kept out of the script list. They have
	// their own GUI, so they're run by opening the Simba IDE and loading them.
	const tools = [
		{ name: "Credentials Helper", note: "Set up the account login stored in credentials.simba." },
		{ name: "Settings Searcher", note: "Browse and edit saved script settings." }
	]
</script>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-10 px-8 pb-16">
	<section class="flex flex-col gap-4">
		<h2 class="h4 font-bold">Bot</h2>
		<div class="flex items-center justify-between gap-4 rounded-md preset-outlined-surface-500 p-4">
			<div class="flex min-w-0 flex-1 flex-col">
				<span>Remote input</span>
				<span class="text-sm opacity-70">
					Sends mouse/keyboard straight to the client so you can use the PC while botting.
					Shared across all scripts — some scripts require it. Toggling it in a script's own GUI
					changes this same setting.
				</span>
			</div>
			<div class="shrink-0">
				<Switch checked={remoteInput} onCheckedChange={async (e) => await toggleRemoteInput(e.checked)}>
					<Switch.Control>
						<Switch.Thumb />
					</Switch.Control>
					<Switch.HiddenInput />
				</Switch>
			</div>
		</div>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="h4 font-bold">Appearance</h2>
		<div class="flex items-center justify-between gap-4 rounded-md preset-outlined-surface-500 p-4">
			<span>Dark mode</span>
			<div class="shrink-0">
				<Switch checked={dark} onCheckedChange={async (e) => await toggleDarkMode(e.checked)}>
					<Switch.Control>
						<Switch.Thumb />
					</Switch.Control>
					<Switch.HiddenInput />
				</Switch>
			</div>
		</div>
		<div class="flex flex-col gap-3 rounded-md preset-outlined-surface-500 p-4">
			<span>Theme</span>
			<div class="flex flex-wrap gap-2">
				{#each themesData as entry (entry.value)}
					<button
						class="btn {theme === entry.value
							? 'preset-filled-primary-500'
							: 'preset-outlined-surface-500 hover:border-primary-500'}"
						onclick={async () => await updateTheme(entry.value)}
					>
						{entry.label}
					</button>
				{/each}
			</div>
		</div>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="h4 font-bold">Simba</h2>
		<div class="flex flex-col gap-3 rounded-md preset-outlined-surface-500 p-4">
			<span class="text-sm opacity-70">
				The engine that runs the scripts. You normally never need this — scripts start from the
				Run button — but you can open it directly to edit or debug scripts.
			</span>
			<div class="flex flex-wrap gap-2">
				<button
					class="btn preset-outlined-surface-500 hover:border-primary-500"
					onclick={openSimba}
				>
					Open Simba IDE
				</button>
				<button
					class="btn preset-outlined-surface-500 hover:border-primary-500"
					onclick={async () => await openPath(simbaPath)}
				>
					Open Simba folder
				</button>
			</div>
		</div>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="h4 font-bold">Tools</h2>
		<div class="flex flex-col gap-3 rounded-md preset-outlined-surface-500 p-4">
			<span class="text-sm opacity-70">
				Account and setup helpers — not bots. Open the Simba IDE and load one to run it.
			</span>
			{#each tools as tool (tool.name)}
				<div class="flex items-center justify-between gap-4">
					<div class="flex flex-col">
						<span class="font-semibold">{tool.name}</span>
						<span class="text-sm opacity-60">{tool.note}</span>
					</div>
				</div>
			{/each}
			<button
				class="btn w-fit preset-outlined-surface-500 hover:border-primary-500"
				onclick={openSimba}
			>
				Open Simba IDE
			</button>
		</div>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="h4 font-bold">Maintenance</h2>
		<div class="flex flex-col gap-3 rounded-md preset-outlined-surface-500 p-4">
			<span class="text-sm opacity-70">
				Reset parts of the Simba install that could have gone bad. Close all game clients and
				Simba instances first.
			</span>
			<div class="flex flex-wrap gap-2">
				<button
					class="btn preset-outlined-surface-500 hover:border-primary-500"
					disabled={busy === "cache"}
					onclick={async () => await clear("cache")}
				>
					Clear Cache
				</button>
				<button
					class="btn preset-outlined-surface-500 hover:border-primary-500"
					disabled={busy === "assets"}
					onclick={async () => await clear("assets")}
				>
					Clear Assets
				</button>
				<button
					class="btn preset-outlined-surface-500 hover:border-primary-500"
					disabled={busy === "configs"}
					onclick={async () => await clear("configs")}
				>
					Clear Configs
				</button>
			</div>
		</div>
	</section>

	<section class="flex flex-col gap-2 text-center text-sm opacity-60">
		<span>
			Elixer Scripts v{#await getVersion()}...{:then version}{version}{/await}
		</span>
	</section>
</main>
