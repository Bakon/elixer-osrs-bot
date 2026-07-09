import { redirect } from "@sveltejs/kit"

export const load = async () => {
	console.log("🔥Loading root page!")
	redirect(303, "/scripts")
}
