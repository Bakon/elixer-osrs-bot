<script lang="ts">
	import ScriptStage from "$lib/components/ScriptStage.svelte"
	import type { TScriptStages } from "$lib/types/collection"

	const {
		children,
		title,
		username,
		description,
		stage
	}: {
		children: any
		title: string
		username: string
		description: string
		stage: TScriptStages
	} = $props()
</script>

<header class="flex w-full flex-col justify-evenly gap-4 xl:flex-row">
	{@render children()}

	<div class="mx-auto my-auto w-auto text-center xl:w-96">
		<h1 class="my-4 h5 font-bold">
			{title ? title : "Loading..."} by
			<span class="text-nowrap"> {username ?? "Loading..."} </span>
		</h1>
		<h2 class="my-4">
			{description ?? "Loading..."}
		</h2>

		<ScriptStage
			{stage}
			size={20}
			tooltip={true}
			styles={"mx-auto px-2 py-1 text-sm lg:text-base"}
		/>
	</div>
</header>
