import { load as storeLoad } from "@tauri-apps/plugin-store"
import { getProfile } from "$lib/supabase"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { channelManager } from "$lib/communication.svelte"
import { invalidate } from "$app/navigation"
export const prerender = true
export const ssr = false

export const load = async () => {
	const promises = await Promise.all([
		getProfile(),
		storeLoad("settings.json", {
			autoSave: true,
			defaults: { dark: true, theme: "cerberus", sidebar: true }
		}),
		invoke("get_executable_path", { exe: "simba" }) as Promise<string>
	])

	const settings = promises[1]
	const settingValues = await Promise.all([
		settings.get("dark"),
		settings.get("theme"),
		settings.get("sidebar")
	])

	const unlisten = await listen<string>("process-finished", async (event) => {
		const channel = Number(event.payload)
		console.log(`Process finished: ${channel}`)
		await Promise.all([channelManager.stopChannel(channel), invalidate("layout:running")])
	})

	return {
		profile: promises[0],
		simbaPath: promises[2],
		settings,
		dark: (settingValues[0] as boolean) ?? true,
		theme: (settingValues[1] as string) ?? "cerberus",
		sidebar: (settingValues[2] as boolean) ?? true,
		unlisten
	}
}
