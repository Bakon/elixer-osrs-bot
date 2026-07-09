import { getData } from "$lib/supabase"

export const load = async ({ params: { slug } }) => {
	console.log("📜Loading scripts page!")
	const scripts = await getData()
	const script = scripts.find((script) => script.id === slug)

	return { scripts, script }
}
