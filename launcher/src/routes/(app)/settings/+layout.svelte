<script lang="ts">
	import ArrowBigLeft from "@lucide/svelte/icons/arrow-big-left"
	let { children } = $props()
</script>

<!-- One scroll container for the whole settings page; the header sticks to the
	 top so a scroll (e.g. focus jump on toggling a switch) can never push it
	 out of view. -->
<div class="h-full w-full overflow-y-auto">
	<nav
		class="sticky top-0 z-20 flex items-center justify-between border-b border-surface-500 bg-surface-50-950 p-4"
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
