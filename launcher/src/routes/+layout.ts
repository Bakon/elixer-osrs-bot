import { load as storeLoad } from "@tauri-apps/plugin-store"
import { getProfile, getSession, getUser, supabase } from "$lib/supabase"
import { error } from "@sveltejs/kit"
import { invoke } from "@tauri-apps/api/core"
import { devModeStore, devPathStore, devUpdatesStore } from "$lib/store"
import { listen } from "@tauri-apps/api/event"
import { channelManager } from "$lib/communication.svelte"
import { invalidate } from "$app/navigation"
export const prerender = true
export const ssr = false

export const load = async ({ depends, url: { searchParams } }) => {
	const err = searchParams.get("error")
	if (err) error(403, "Login error: " + err)

	depends("root:layout")

	const promises = await Promise.all([
		getSession(),
		storeLoad("settings.json", {
			autoSave: true,
			defaults: { dark: true, theme: "wasp", sidebar: true }
		}),
		getProfile(getUser()),
		invoke("get_executable_path", { exe: "simba" }) as Promise<string>,
		invoke("get_executable_path", { exe: "devsimba" }) as Promise<string>,
		invoke("get_dev_mode") as Promise<boolean>,
		invoke("get_dev_updates") as Promise<boolean>
	])

	const settings = promises[1]
	const settingValues = await Promise.all([
		settings.get("dark"),
		settings.get("theme"),
		settings.get("sidebar")
	])

	devPathStore.set(promises[4])
	devModeStore.set(promises[5])
	devUpdatesStore.set(promises[6])

	const unlisten = await listen<string>("process-finished", async (event) => {
		const channel = Number(event.payload)
		console.log(`Process finished: ${channel}`)
		await Promise.all([channelManager.stopChannel(channel), invalidate("layout:running")])
	})

	return {
		supabase,
		session: promises[0],
		profile: promises[2],
		simbaPath: promises[3],
		settings,
		dark: (settingValues[0] as boolean) ?? true,
		theme: (settingValues[1] as string) ?? "wasp",
		sidebar: (settingValues[2] as boolean) ?? true,
		unlisten
	}
}
