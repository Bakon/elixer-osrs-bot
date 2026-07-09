<script lang="ts">
	import { getVersion } from "@tauri-apps/api/app"
	let { data } = $props()
</script>

<main class="flex flex-col">
	<div class="my-4 flex w-full flex-col gap-4 text-center font-bold text-surface-800-200">
		<span>
			wasp-launcher v{#await getVersion()} Loading...{:then version}{version}{/await}
		</span>
		<span>
			wasp-plugins v{#await data.pluginVersions} Loading...{:then version}{version}{/await}
		</span>
	</div>
</main>
