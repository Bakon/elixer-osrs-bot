import { Navigate } from "react-router-dom"
import { library } from "../../lib/library"
import { isUtility } from "../../lib/scripts"
import { useAppData } from "../../AppData"
import { displayTitle } from "./display"

// Open the script you last had open; otherwise the first one under "All"
// (verdict-ed, alphabetical), otherwise just the first visible script.
// osrs-bot: an empty local Scripts folder is a valid state — show the
// (empty) list instead of redirecting into a nonexistent script.
export function ScriptsIndex() {
	const { scripts } = useAppData()

	const visible = scripts.filter((s) => !isUtility(s) && !library.isHidden(s.id))
	const byTitle = [...visible].sort((a, b) => displayTitle(a).localeCompare(displayTitle(b)))

	const target =
		visible.find((s) => s.id === library.lastViewed) ??
		byTitle.find((s) => library.verdicts[s.id]) ??
		byTitle[0] ??
		scripts[0]

	if (!target) return null
	return <Navigate to={`/scripts/${target.id}`} replace />
}
