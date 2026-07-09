import { channelManager } from "$lib/communication.svelte.js"

export const prerender = false
export const ssr = false

export const load = async ({ depends, params: { slug } }) => {
	depends("layout:running")
	const process = Number(slug)
	const channel = channelManager.channels[process]
	return { process, channel }
}
