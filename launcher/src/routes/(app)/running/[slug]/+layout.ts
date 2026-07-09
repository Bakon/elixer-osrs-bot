import { channelManager } from "$lib/communication.svelte"
import { redirect } from "@sveltejs/kit"

export const prerender = false
export const ssr = false

export const load = async ({ parent, depends }) => {
	const { channel } = await parent()
	depends("layout:channel")
	if (!channel) redirect(303, "/running")
	return { channel }
}
