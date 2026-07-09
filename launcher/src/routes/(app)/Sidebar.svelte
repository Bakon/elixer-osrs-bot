<script lang="ts">
	import { page } from "$app/state"
	import { devModeStore, devPathStore, devUpdatesStore } from "$lib/store"
	import { supabase } from "$lib/supabase"
	import { Tooltip, Portal } from "@skeletonlabs/skeleton-svelte"
	import type { Session } from "@supabase/supabase-js"
	import { invoke } from "@tauri-apps/api/core"
	import { fetch } from "@tauri-apps/plugin-http"
	import { revealItemInDir } from "@tauri-apps/plugin-opener"
	import CircleArrowRight from "@lucide/svelte/icons/circle-arrow-right"
	import Gamepad2 from "@lucide/svelte/icons/gamepad-2"
	import TestTubeDiagonal from "@lucide/svelte/icons/test-tube-diagonal"
	import FolderCode from "@lucide/svelte/icons/folder-code"
	import PawPrint from "@lucide/svelte/icons/paw-print"
	import FolderClosed from "@lucide/svelte/icons/folder-closed"
	import Settings from "@lucide/svelte/icons/settings"

	const { settings, sidebar } = $derived(page.data)
	const session: Session = $derived(page.data.session)
	const path: string = $derived(page.data.simbaPath + "//Plugins")

	let settingsBtn = $derived(
		page.url.pathname.startsWith("/settings") ? "/scripts" : "/settings/general"
	)

	let runningBtn = $derived(page.url.pathname.startsWith("/running") ? "/scripts" : "/running")

	async function getNewSessionToken() {
		let result = ""
		try {
			const response = await fetch("https://api.waspscripts.dev/session", {
				method: "GET",
				headers: {
					authorization: "Bearer " + session.access_token,
					refreshtoken: session.refresh_token,
					"Content-Type": "application/json"
				}
			})
			const data = await response.json()
			result = data.refresh_token
		} catch (err) {
			console.error(err)
		}

		return result
	}

	async function execute(exe: string, wasplib: string) {
		const promises = await Promise.all([
			getNewSessionToken(),
			supabase
				.schema("scripts")
				.from("wasplib")
				.select("simba")
				.order("created_at", { ascending: false })
				.limit(1)
				.single()
		])

		let refresh_token = promises[0]

		const { data, error: versionErr } = promises[1]

		if (versionErr) {
			console.error(versionErr)
			return
		}

		const args = ["", data.simba, wasplib, "", "", refresh_token]

		console.log(exe)
		console.log(args)
		await invoke("run_executable", { exe, args })
	}

	// svelte-ignore state_referenced_locally
	let currentSidebar = $state(sidebar) as boolean

	async function toggleSidebar() {
		currentSidebar = !currentSidebar
		document.documentElement.classList.toggle("sidebar")
		await settings.set("sidebar", currentSidebar)
	}
</script>

<div class="flex h-full flex-col justify-between gap-1 border-l border-surface-500 px-1">
	<Tooltip positioning={{ placement: "top" }} openDelay={700}>
		<Tooltip.Trigger
			onclick={toggleSidebar}
			class="btn flex h-9 w-full justify-start preset-filled-surface-500 text-xs *:pointer-events-none lg:text-sm"
		>
			<span class="duration-400" class:rotate-180={!currentSidebar}>
				<CircleArrowRight size={20} />
			</span>
			{#if currentSidebar}
				Collapse
			{/if}
		</Tooltip.Trigger>
		<Portal>
			<Tooltip.Positioner>
				<Tooltip.Content class="card preset-filled p-4">
					{#if currentSidebar}Collapse{:else}Expand{/if}
				</Tooltip.Content>
			</Tooltip.Positioner>
		</Portal>
	</Tooltip>

	<Tooltip positioning={{ placement: "top" }} openDelay={700}>
		<Tooltip.Trigger>
			<a
				href={runningBtn}
				class="btn flex h-9 w-full justify-start preset-filled-surface-500 text-xs *:pointer-events-none lg:text-sm"
				data-sveltekit-preload-data="false"
			>
				<Gamepad2 size={20} />
				{#if currentSidebar}
					Running
				{/if}
			</a>
		</Tooltip.Trigger>
		<Portal>
			<Tooltip.Positioner>
				<Tooltip.Content class="card preset-filled p-4">Show running scripts</Tooltip.Content>
			</Tooltip.Positioner>
		</Portal>
	</Tooltip>

	<div class="flex h-full flex-col justify-end gap-1 px-1">
		{#if $devModeStore}
			<Tooltip positioning={{ placement: "top" }} openDelay={700}>
				<Tooltip.Trigger
					class="btn flex h-9 w-full justify-start preset-filled-surface-500 text-xs *:pointer-events-none lg:text-sm"
					onclick={async () => await execute("devsimba", $devUpdatesStore ? "latest" : "none")}
				>
					<TestTubeDiagonal size={20} />
					{#if currentSidebar}
						Dev Simba
					{/if}
				</Tooltip.Trigger>
				<Portal>
					<Tooltip.Positioner>
						<Tooltip.Content class="card preset-filled p-4">Run Development Simba</Tooltip.Content>
					</Tooltip.Positioner>
				</Portal>
			</Tooltip>

			<Tooltip positioning={{ placement: "top" }} openDelay={700}>
				<Tooltip.Trigger
					class="btn flex h-9 w-full justify-start preset-filled-surface-500 text-xs *:pointer-events-none lg:text-sm"
					onclick={async () => await revealItemInDir($devPathStore + "//Plugins")}
				>
					<FolderCode size={20} />
					{#if currentSidebar}
						Dev Folder
					{/if}
				</Tooltip.Trigger>
				<Portal>
					<Tooltip.Positioner>
						<Tooltip.Content class="card preset-filled p-4"
							>Open Development Directory</Tooltip.Content
						>
					</Tooltip.Positioner>
				</Portal>
			</Tooltip>
		{/if}
		<Tooltip positioning={{ placement: "top" }} openDelay={700}>
			<Tooltip.Trigger
				class="btn flex h-9 w-full justify-start preset-filled-surface-500 text-xs *:pointer-events-none lg:text-sm"
				onclick={() => execute("simba", "latest")}
			>
				<PawPrint size={20} />
				{#if currentSidebar}
					Simba
				{/if}
			</Tooltip.Trigger>
			<Portal>
				<Tooltip.Positioner>
					<Tooltip.Content class="card preset-filled p-4">Update and Run Simba</Tooltip.Content>
				</Tooltip.Positioner>
			</Portal>
		</Tooltip>

		<Tooltip positioning={{ placement: "top" }} openDelay={700}>
			<Tooltip.Trigger
				class="btn flex h-9 w-full justify-start preset-filled-surface-500 text-xs *:pointer-events-none lg:text-sm"
				onclick={async () => await revealItemInDir(path)}
			>
				<FolderClosed size={20} />
				{#if currentSidebar}
					Simba Folder
				{/if}
			</Tooltip.Trigger>
			<Portal>
				<Tooltip.Positioner>
					<Tooltip.Content class="card preset-filled p-4">Open Simba Directory</Tooltip.Content>
				</Tooltip.Positioner>
			</Portal>
		</Tooltip>

		<Tooltip positioning={{ placement: "top" }} openDelay={700}>
			<Tooltip.Trigger>
				<a
					href={settingsBtn}
					class="btn flex h-9 w-full justify-start preset-filled-surface-500 text-xs *:pointer-events-none lg:text-sm"
					data-sveltekit-preload-data="false"
				>
					<Settings size={20} />
					{#if currentSidebar}
						Settings
					{/if}
				</a>
			</Tooltip.Trigger>
			<Portal>
				<Tooltip.Positioner>
					<Tooltip.Content class="card preset-filled p-4">Settings</Tooltip.Content>
				</Tooltip.Positioner>
			</Portal>
		</Tooltip>
	</div>
</div>
