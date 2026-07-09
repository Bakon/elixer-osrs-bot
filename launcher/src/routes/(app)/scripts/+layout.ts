import { redirect } from "@sveltejs/kit"

export const load = async ({ parent }) => {
	const { scripts, script } = await parent()
	// osrs-bot: an empty local Scripts folder is a valid state — show the
	// (empty) list instead of redirecting into a nonexistent script.
	if (!script && scripts.length > 0) redirect(303, "/scripts/" + scripts[0].id)
	return
}
