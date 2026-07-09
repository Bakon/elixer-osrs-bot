<script lang="ts">
	import { page } from "$app/state"
	import { Avatar } from "@skeletonlabs/skeleton-svelte"
	import LogOut from "@lucide/svelte/icons/log-out"
	import Logo from "./Navigation/Logo.svelte"
	import Lightswitch from "./Navigation/Lightswitch.svelte"
	import ThemeSwitcher from "./Navigation/ThemeSwitcher.svelte"
	import RoleBadge from "$lib/components/RoleBadge.svelte"

	let showProfile = $state(false)

	const { supabase, profile } = $derived(page.data)

	function randomString() {
		return (Math.random() + 1).toString(36).substring(7)
	}

	const src = $derived(
		profile ? profile.avatar : "https://api.dicebear.com/6.x/bottts/svg?seed=" + randomString()
	)

	async function logout() {
		const { error: err } = await supabase.auth.signOut()
		if (err) console.error(err)
	}
</script>

<nav class="w-full flex-col text-base">
	<div
		class="flex h-full w-full justify-between bg-surface-300/30 font-semibold backdrop-blur-md dark:bg-surface-800/30"
	>
		<a
			href="/scripts"
			class="mx-4 my-auto flex h-full text-surface-600 hover:text-primary-800 dark:text-primary-500 dark:hover:text-primary-100"
			aria-label="Navigate to home page"
			data-sveltekit-preload-data="false"
		>
			<Logo />
		</a>

		<div class="mx-2 flex gap-1">
			<button
				name="User panel"
				aria-label="Open user panel"
				class="group flex items-center justify-around p-2"
				onclick={() => (showProfile = !showProfile)}
			>
				<span class="mx-2 my-auto hidden group-hover:text-primary-500 md:block">
					{profile.username}
				</span>

				<Avatar
					class="h-11 w-12 border-2 group-hover:preset-tonal {showProfile
						? 'border-primary-500'
						: 'border-surface-500'}"
				>
					<Avatar.Image {src} alt={profile.username} loading="eager" />
					<Avatar.Fallback>{profile.username}</Avatar.Fallback>
				</Avatar>
			</button>

			<Lightswitch />
			<ThemeSwitcher />
		</div>
	</div>

	<div
		class="absolute z-50 w-full bg-surface-200/30 py-14 backdrop-blur-md dark:bg-surface-800/30 {showProfile
			? 'flex flex-col'
			: 'hidden'}"
	>
		<header class="card-header mx-auto my-6 flex text-center md:hidden">{profile.username}</header>

		<section class="flex flex-col p-4">
			<h3 class="mx-auto my-4 text-center">Role</h3>
			<div class="flex pt-2 pb-8">
				<RoleBadge />
			</div>
		</section>

		<button
			name="Logout"
			aria-label="Logout"
			class="mx-auto btn preset-filled-primary-500"
			onclick={async () => await logout()}
		>
			<LogOut />
			Logout
		</button>
	</div>
</nav>
