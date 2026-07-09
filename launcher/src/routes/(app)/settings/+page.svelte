<script lang="ts">
	import { page } from "$app/state"
	import { invoke } from "@tauri-apps/api/core"
	import { getVersion } from "@tauri-apps/api/app"
	import { Switch } from "@skeletonlabs/skeleton-svelte"

	const { settings } = $derived(page.data)

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

	// --- Maintenance ------------------------------------------------------
	let busy = $state("")
	async function clear(what: "cache" | "assets" | "configs") {
		busy = what
		await invoke("delete_" + what, { exe: "simba" })
		busy = ""
	}

</script>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-10 px-8 pb-16">
	<section class="flex flex-col gap-4">
		<h2 class="h4 font-bold">Appearance</h2>
		<div class="flex items-center justify-between rounded-md preset-outlined-surface-500 p-4">
			<span>Dark mode</span>
			<Switch checked={dark} onCheckedChange={async (e) => await toggleDarkMode(e.checked)}>
				<Switch.Control>
					<Switch.Thumb />
				</Switch.Control>
				<Switch.HiddenInput />
			</Switch>
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
