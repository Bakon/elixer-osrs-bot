import { channelManager } from "$lib/communication.svelte"
import { redirect } from "@sveltejs/kit"

export const load = async () => {
	if (channelManager.processes.length > 0)
		redirect(303, "/running/" + channelManager.processes[0].toString())
	return
}
