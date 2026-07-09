<script lang="ts">
	import { Portal, Tooltip } from "@skeletonlabs/skeleton-svelte"
	import { invoke } from "@tauri-apps/api/core"

	let { icon, label, exe, args } = $props()

	async function execute() {
		const result = await invoke("run_executable", { exe, args })
		console.log("run_executable: ", result)
	}
	let openState = $state(false)
</script>

<Tooltip
	open={openState}
	onOpenChange={(e) => (openState = e.open)}
	positioning={{ placement: "top" }}
	openDelay={1000}
>
	<Tooltip.Trigger class="underline">
		<button class="btn preset-filled-surface-500 *:pointer-events-none" onclick={execute}>
			{icon}
		</button>
	</Tooltip.Trigger>
	<Portal>
		<Tooltip.Positioner>
			<Tooltip.Content class="card preset-filled p-4">
				{label}
			</Tooltip.Content>
		</Tooltip.Positioner>
	</Portal>
</Tooltip>
