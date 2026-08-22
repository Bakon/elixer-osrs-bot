import { createContext, useContext } from "react"
import type { ScriptEx } from "./lib/types/collection"

export interface AppData {
	scripts: ScriptEx[]
	simbaPath: string
}

export const AppDataContext = createContext<AppData | null>(null)

export function useAppData(): AppData {
	const data = useContext(AppDataContext)
	if (!data) throw new Error("AppDataContext missing")
	return data
}
