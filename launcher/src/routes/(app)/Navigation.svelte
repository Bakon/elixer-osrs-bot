<script lang="ts">
	import { page } from "$app/state"
	import { Avatar } from "@skeletonlabs/skeleton-svelte"

	const { profile } = $derived(page.data)

	const avatarLetter = $derived((profile?.username?.[0] ?? "?").toUpperCase())
</script>

<nav class="w-full flex-col text-base">
	<div
		class="flex h-full w-full justify-between bg-surface-300/30 font-semibold backdrop-blur-md dark:bg-surface-800/30"
	>
		<a
			href="/scripts"
			class="mx-4 my-auto flex h-full items-center text-lg font-bold tracking-wide text-surface-600 hover:text-primary-800 dark:text-primary-500 dark:hover:text-primary-100"
			aria-label="Navigate to home page"
			data-sveltekit-preload-data="false"
		>
			Elixer Scripts
		</a>

		<a
			href="/settings"
			class="group m-2 flex items-center"
			aria-label="Open settings"
			data-sveltekit-preload-data="false"
		>
			<Avatar
				class="h-10 w-10 rounded-full border-2 border-surface-500 group-hover:border-primary-500"
			>
				<Avatar.Fallback class="text-lg font-bold">{avatarLetter}</Avatar.Fallback>
			</Avatar>
		</a>
	</div>
</nav>
