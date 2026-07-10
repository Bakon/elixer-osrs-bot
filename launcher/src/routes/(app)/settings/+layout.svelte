<script lang="ts">
	import ArrowBigLeft from "@lucide/svelte/icons/arrow-big-left"
	let { children } = $props()
</script>

<div class="flex h-full w-full flex-col overflow-hidden">
	<nav
		class="flex items-center justify-between border-b border-surface-500 p-4"
	>
		<a
			href="/scripts"
			aria-label="Navigate to the main page"
			data-sveltekit-preload-data="false"
			class="flex gap-2 hover:text-primary-100"
		>
			<ArrowBigLeft /> Back
		</a>
		<h1 class="h4 font-bold">Settings</h1>
		<span class="w-16"></span>
	</nav>

	<div class="min-h-0 flex-1">
		{@render children()}
	</div>
</div>
