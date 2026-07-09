<script lang="ts">
	import { page } from "$app/state"
	const role = $derived(page.data.profile?.role)
</script>

<div class="flex w-full justify-evenly gap-2">
	{#if role == "premium"}
		<span
			class="inline-block rounded-full bg-yellow-500 px-2.5 py-1 text-center align-baseline text-xs leading-none font-bold whitespace-nowrap text-white xl:px-7 xl:py-5"
		>
			Premium
		</span>
	{:else if role == "vip"}
		<span
			class="inline-block rounded-full bg-red-500 px-2.5 py-1 text-center align-baseline text-xs leading-none font-bold whitespace-nowrap text-white xl:px-7 xl:py-5"
		>
			VIP
		</span>
	{:else if role == "tester"}
		<span
			class="inline-block rounded-full bg-green-500 px-2.5 py-1 text-center align-baseline text-xs leading-none font-bold whitespace-nowrap text-white xl:px-7 xl:py-5"
		>
			Tester
		</span>
	{:else if role == "scripter"}
		<span
			class="inline-block rounded-full bg-teal-500 px-2.5 py-1 text-center align-baseline text-xs leading-none font-bold whitespace-nowrap text-white xl:px-7 xl:py-5"
		>
			Scripter
		</span>
	{:else if role == "moderator"}
		<span
			class="inline-block rounded-full bg-purple-500 px-2.5 py-1 text-center align-baseline text-xs leading-none font-bold whitespace-nowrap text-white xl:px-7 xl:py-5"
		>
			Mod
		</span>
	{:else if role == "administrator"}
		<span
			class="inline-block rounded-full bg-orange-500 px-2.5 py-1 text-center align-baseline text-xs leading-none font-bold whitespace-nowrap text-white xl:px-7 xl:py-5"
		>
			Admin
		</span>
	{:else}
		<span
			class="inline-block rounded-full bg-stone-500 px-2.5 py-1 text-center align-baseline text-xs leading-none font-bold whitespace-nowrap text-white xl:px-7 xl:py-5"
		>
			OSRS Botter
		</span>
	{/if}
</div>
