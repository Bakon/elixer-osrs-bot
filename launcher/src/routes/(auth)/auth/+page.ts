import { redirect } from "@sveltejs/kit"

export const load = async ({ parent }) => {
	const { session, profile } = await parent()
	console.log("🤖Loading auth page!")
	if (session && profile) {
		redirect(303, "/scripts")
	}
	return
}
