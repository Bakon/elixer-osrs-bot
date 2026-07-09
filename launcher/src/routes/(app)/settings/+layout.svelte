<script lang="ts">
	import ArrowBigLeft from "@lucide/svelte/icons/arrow-big-left"
	import Settings from "@lucide/svelte/icons/settings"
	import TestTubeDiagonal from "@lucide/svelte/icons/test-tube-diagonal"
	import Info from "@lucide/svelte/icons/info"
	import { page } from "$app/state"

	let { children } = $props()
	const path = $derived(page.url.pathname)
</script>

<div class="flex h-full w-full flex-col overflow-y-auto">
	<nav class="m-4">
		<ul class="flex justify-between gap-4">
			<li>
				<a
					href="/scripts"
					aria-label="Navigate to the main page"
					data-sveltekit-preload-data="false"
					class="flex gap-2 hover:text-primary-100"
					class:text-primary-500={path.endsWith("back")}
				>
					<ArrowBigLeft /> Back
				</a>
			</li>

			<div class="flex gap-24">
				<li>
					<a
						href="/settings/general"
						aria-label="Navigate to general settings"
						data-sveltekit-preload-data="false"
						class="flex gap-2 hover:text-primary-100"
						class:text-primary-500={path.endsWith("general")}
					>
						<Settings /> General
					</a>
				</li>
				<li>
					<a
						href="/settings/development"
						aria-label="Navigate to development settings"
						data-sveltekit-preload-data="false"
						class="flex gap-2 hover:text-primary-100"
						class:text-primary-500={path.endsWith("development")}
					>
						<TestTubeDiagonal />Development
					</a>
				</li>
			</div>

			<li>
				<a
					href="/settings/information"
					aria-label="Navigate to information"
					data-sveltekit-preload-data="false"
					class="flex gap-2 hover:text-primary-100"
					class:text-primary-500={path.endsWith("information")}
				>
					<Info /> Information
				</a>
			</li>
		</ul>
	</nav>

	{@render children()}
</div>
