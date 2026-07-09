<script lang="ts">
	import { channelManager } from "$lib/communication.svelte"
	import { onMount, tick } from "svelte"
	const { data } = $props()

	let container: HTMLDivElement

	const logs = $derived([...channelManager.getLogs(data.process)])

	function scrollDown() {
		if (!container) return
		container.scrollTop = container.scrollHeight
	}

	$effect(() => {
		logs
		tick().then(() => scrollDown())
	})

	onMount(() => (container = document.getElementById("running-container") as HTMLDivElement))
</script>

<div class="font-mono text-sm leading-tight">
	{#each logs as log}
		<span style="color:#{log.color}">{log.text}</span>
		{#if log.close}<br />{/if}
	{/each}
</div>
