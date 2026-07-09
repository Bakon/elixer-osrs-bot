import type { Database } from "./supabase"

export type Role = Database["profiles"]["Enums"]["roles"] | null
export type TScriptStages = Database["scripts"]["Enums"]["stage"]

export interface Script {
	id: string
	url: string
	title: string
	description: string
	content: string
	published: boolean
	protected: {
		username: string
		avatar: string
		revision: number
		updated_at: number
	}
	metadata: {
		status: Database["scripts"]["Enums"]["status"]
		type: Database["scripts"]["Enums"]["type"]
		stage: TScriptStages
	}
}

export interface StatsLimits {
	xp_min: number
	xp_max: number
	gp_min: number
	gp_max: number
}

export type ScriptEx = Script & {
	access: boolean
}
