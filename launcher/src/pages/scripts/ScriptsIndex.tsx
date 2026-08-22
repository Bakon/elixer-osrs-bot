import { Navigate } from "react-router-dom"
import { useAppData } from "../../AppData"

// osrs-bot: an empty local Scripts folder is a valid state — show the
// (empty) list instead of redirecting into a nonexistent script.
export function ScriptsIndex() {
	const { scripts } = useAppData()
	if (scripts.length === 0) return null
	return <Navigate to={`/scripts/${scripts[0].id}`} replace />
}
