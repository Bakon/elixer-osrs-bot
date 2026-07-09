import { redirect } from "@sveltejs/kit"

export const load = async ({ parent }) => {
	const { scripts, script } = await parent()
	if (!script) redirect(303, "/scripts/" + scripts[0].id)
	return
}
