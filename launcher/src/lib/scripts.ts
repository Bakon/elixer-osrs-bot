import type { ScriptEx } from "./types/collection"

// osrs-bot: the filename stem (basename without .simba) is the stable key used
// for generated descriptions and matching. script.url looks like
// "waspscripts.com/foo-by-bar.simba" or "community/foo.simba".
export function stemOf(script: ScriptEx): string {
	const base = script.url.split("/").pop() ?? script.url
	return base.replace(/\.simba$/i, "")
}

// Setup/account utilities — not bots. Kept out of the main script list and
// surfaced under Settings instead.
export const UTILITY_STEMS = new Set([
	"credentials-helper-by-baconadors",
	"settings-searcher-by-canadianjames"
])

export function isUtility(script: ScriptEx): boolean {
	return UTILITY_STEMS.has(stemOf(script))
}
