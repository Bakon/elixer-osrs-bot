<script lang="ts">
	import type { TScriptStages } from "$lib/types/collection"
	import { Skull } from "@lucide/svelte"
	import { Microscope } from "@lucide/svelte"
	import { Dna } from "@lucide/svelte"
	import { Lightbulb } from "@lucide/svelte"
	import { Portal, Tooltip } from "@skeletonlabs/skeleton-svelte"

	let {
		stage,
		size = 14,
		tooltip = false,
		styles
	}: { stage: TScriptStages; size?: number; tooltip?: boolean; styles: string } = $props()

	const scriptStages: Record<TScriptStages, string> = {
		prototype: "Prototype",
		alpha: "Alpha",
		beta: "Beta",
		stable: "Stable",
		archived: "Archived"
	}

	const name = $derived(scriptStages[stage])
</script>

{#if stage !== "stable"}
	<Tooltip positioning={{ placement: "bottom" }}>
		<Tooltip.Trigger
			class="my-auto flex h-fit w-fit cursor-default gap-1 rounded-md preset-outlined-surface-600-400 preset-filled-surface-500 hover:preset-tonal {styles}"
		>
			{#if stage == "prototype"}
				<Lightbulb {size} class="my-auto" />
			{:else if stage == "alpha"}
				<Dna {size} class="my-auto" />
			{:else if stage == "beta"}
				<Microscope {size} class="my-auto" />
			{:else}
				<Skull {size} class="my-auto" />
			{/if}
			{name}
		</Tooltip.Trigger>
		{#if tooltip}
			<Portal>
				<Tooltip.Positioner>
					<Tooltip.Content class="card preset-filled-surface-950-50 p-2">
						<span>
							This script is in <b>{name}</b> and might not be stable!
						</span>
						<Tooltip.Arrow
							class="[--arrow-background:var(--color-surface-950-50)] [--arrow-size:--spacing(2)]"
						>
							<Tooltip.ArrowTip />
						</Tooltip.Arrow>
					</Tooltip.Content>
				</Tooltip.Positioner>
			</Portal>
		{/if}
	</Tooltip>
{/if}
