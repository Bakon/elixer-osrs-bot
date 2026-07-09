<script lang="ts">
	import ArrowBigLeft from "@lucide/svelte/icons/arrow-big-left"
	let { children } = $props()
</script>

<div class="flex h-full w-full flex-col overflow-y-auto">
	<nav
		class="sticky top-0 z-10 flex items-center justify-between bg-surface-50/80 p-4 backdrop-blur-md dark:bg-surface-950/80"
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

	{@render children()}
</div>
