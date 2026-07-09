<script lang="ts">
	import { invoke } from "@tauri-apps/api/core"
	import { open } from "@tauri-apps/plugin-dialog"
	import { Switch } from "@skeletonlabs/skeleton-svelte"
	import { mdRenderer } from "$lib/markdown"
	import { devModeStore, devPathStore, devUpdatesStore } from "$lib/store"

	async function setDevMode(state: boolean) {
		await invoke("set_dev_mode", { state })
		devModeStore.set(state)
		return
	}

	async function setDevUpdates(state: boolean) {
		await invoke("set_dev_updates", { state })
		$devUpdatesStore = state
		return
	}

	async function updateDevPath(exe: string, current: string) {
		let path = await open({
			title: "Pick a " + exe.toUpperCase() + " directory",
			defaultPath: current,
			multiple: false,
			directory: true,
			filters: [{ name: "Directories", extensions: [] }]
		})
		if (!path) {
			return
		}
		await invoke("set_executable_path", { exe, path })
		devPathStore.set(path)
	}

	let deletingCache = $state(false)
	async function deleteCache() {
		deletingCache = true
		await invoke("delete_cache", { exe: "devsimba" })
		deletingCache = false
	}

	let deletingAssets = $state(false)
	async function deleteAssets() {
		deletingAssets = true
		await invoke("delete_assets", { exe: "devsimba" })
		deletingAssets = false
	}

	let deletingConfigs = $state(false)
	async function deleteConfigs() {
		deletingConfigs = true
		await invoke("delete_configs", { exe: "devsimba" })
		deletingConfigs = false
	}

	const info = `### This section is only for people that are interested in development.
This exists to automate installation and/or updates to Simba regarding how it's used in WaspScripts.

By default, wasp-launcher uses \`%localappdata%/com.wasp-launcher.app/Simba\` directory for everything Simba related.

You can change your development folder below (it's recommended you create the folder you want things to be installed on first) and this is going to do the following:
- The sidebar will have 2 extra buttons, one to run Simba from the development path and another one to open it's directory
- When you run Simba through this button, Simba is given the following environment variable: \`WASP_REFRESH_TOKEN\`
- Plugins are always overwritten with whatever are the latest ones
- Unless you toggle it below, running Simba through this button will remove your WaspLib and install the latest version

Also while on this tab, the buttons below will affect your development path.`
</script>

<main class="mx-12 flex flex-col gap-6">
	<div
		class="mx-auto prose h-80 w-full min-w-full overflow-y-scroll rounded-md preset-outlined-surface-300-700 p-8 dark:prose-invert"
	>
		{@html mdRenderer.render(info)}
	</div>

	<Switch
		checked={$devModeStore}
		onCheckedChange={async (e) => {
			await setDevMode(e.checked)
		}}
		class="mx-auto"
	>
		<Switch.Control>
			<Switch.Thumb />
		</Switch.Control>
		<Switch.Label>Development Mode</Switch.Label>
		<Switch.HiddenInput />
	</Switch>

	<div class="flex">
		<label class="mx-auto label-text">
			Development environment path:
			<input
				class="input w-96 preset-filled-surface-200-800 hover:outline-1 hover:outline-primary-500"
				value={$devPathStore}
				onclick={async () => await updateDevPath("devsimba", $devPathStore)}
				disabled={!$devModeStore}
			/>
		</label>

		<Switch
			checked={$devUpdatesStore}
			onCheckedChange={async (e) => {
				await setDevUpdates(e.checked)
			}}
			class="mx-auto"
			disabled={!$devModeStore}
		>
			<Switch.Control>
				<Switch.Thumb />
			</Switch.Control>
			<Switch.Label>Update WaspLib on launch</Switch.Label>
			<Switch.HiddenInput />
		</Switch>
	</div>

	<div class="mx-auto flex gap-2">
		<button
			class="btn preset-filled-primary-500 font-bold"
			disabled={deletingCache || !$devModeStore}
			onclick={async () => await deleteCache()}
		>
			Clear Cache
		</button>

		<button
			class="btn preset-filled-primary-500 font-bold"
			disabled={deletingAssets || !$devModeStore}
			onclick={async () => await deleteAssets()}
		>
			Clear Assets
		</button>
		<button
			class="btn preset-filled-primary-500 font-bold"
			disabled={deletingConfigs || !$devModeStore}
			onclick={async () => await deleteConfigs()}
		>
			Clear Configs
		</button>

	</div>
</main>
