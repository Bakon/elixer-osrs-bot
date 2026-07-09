<script lang="ts">
	import { mdRenderer } from "$lib/markdown"
	import { invoke } from "@tauri-apps/api/core"

	let deletingCache = $state(false)
	async function deleteCache() {
		deletingCache = true
		await invoke("delete_cache", { exe: "simba" })
		deletingCache = false
	}

	let deletingAssets = $state(false)
	async function deleteAssets() {
		deletingAssets = true
		await invoke("delete_assets", { exe: "simba" })
		deletingAssets = false
	}

	let deletingConfigs = $state(false)
	async function deleteConfigs() {
		deletingConfigs = true
		await invoke("delete_configs", { exe: "simba" })
		deletingConfigs = false
	}

	let dialog: HTMLDialogElement
	let reinstallingPlugins = $state(false)
	async function reinstallPlugins() {
		dialog.close()
		reinstallingPlugins = true
		await invoke("reinstall_plugins", { exe: "simba" })
		reinstallingPlugins = false
	}

	const info = `Here you can reset several things related to your Simba install that could have gone bad.

If you keep having issues, it's recommened you close all of your runescape clients and/or Simba instances before trying the buttons below.`
</script>

<main class="mx-12 flex flex-col gap-6">
	<div
		class="mx-auto prose h-80 w-full min-w-full overflow-y-scroll rounded-md preset-outlined-surface-300-700 p-8 dark:prose-invert"
	>
		{@html mdRenderer.render(info)}
	</div>

	<div class="mx-auto my-4 flex gap-2">
		<button
			class="btn preset-filled-primary-500 font-bold"
			class:disabled={deletingCache}
			disabled={deletingCache}
			onclick={async () => await deleteCache()}
		>
			Clear Cache
		</button>
		<button
			class="btn preset-filled-primary-500 font-bold"
			class:disabled={deletingAssets}
			disabled={deletingAssets}
			onclick={async () => await deleteAssets()}
		>
			Clear Assets
		</button>
		<button
			class="btn preset-filled-primary-500 font-bold"
			class:disabled={deletingConfigs}
			disabled={deletingConfigs}
			onclick={async () => await deleteConfigs()}
		>
			Clear Configs
		</button>

		<dialog
			bind:this={dialog}
			class="top-1/2 left-1/2 z-10 max-w-160 -translate-1/2 space-y-4 rounded-container bg-surface-100-900 p-4 text-inherit backdrop-blur-lg backdrop:bg-surface-50-950/90"
		>
			<h2 class="h3">Reinstall Plugins</h2>
			<p>Please make sure you are not running any client you've used waspscripts on.</p>
			<p>
				If you are not sure close all clients you have open, check the task manager to be sure none
				is running in the background.
			</p>
			<footer class="flex justify-end gap-4">
				<button type="button" class="btn preset-tonal" onclick={() => dialog.close()}>
					Cancel
				</button>
				<button class="btn preset-filled" onclick={reinstallPlugins}> Confirm </button>
			</footer>
		</dialog>

		<button
			class="btn preset-filled-primary-500 font-bold"
			disabled={reinstallingPlugins}
			onclick={() => dialog.showModal()}
		>
			Reinstall plugins
		</button>
	</div>
</main>
