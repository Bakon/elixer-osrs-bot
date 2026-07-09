import type { Script, StatsLimits, TScriptStages } from "./types/collection"

export function formatNumber(n: number): string {
	let i = 0
	let f: number = n
	const arr: string[] = ["", "K", "M", "B", "T"]

	while (Math.abs(f) >= 1000) {
		i++
		f = f / 1000
	}

	return parseFloat(f.toFixed(2)).toString() + arr[i]
}

export function replaceScriptContent(
	script: Script,
	limits: StatsLimits,
	locale: string = "pt-PT"
) {
	const date: Intl.DateTimeFormatOptions = {
		day: "2-digit",
		month: "2-digit",
		year: "numeric"
	}

	const time: Intl.DateTimeFormatOptions = {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false
	}

	const placeholders: { [key: string]: string } = {
		id: script.id,
		title: script.title,
		description: script.description,
		author: script.protected.username,
		revision: script.protected.revision.toString(),
		updated_at: new Date(script.protected.updated_at).toLocaleString(locale),
		revision_date: new Date(script.protected.updated_at).toLocaleString(locale, date),
		revision_time: new Date(script.protected.updated_at).toLocaleString(locale, time),
		min_xp: formatNumber(Number(limits.xp_min * 12)),
		max_xp: formatNumber(Number(limits.xp_max * 12)),
		min_gp: formatNumber(Number(limits.gp_min * 12)),
		max_gp: formatNumber(Number(limits.gp_max * 12))
	}

	const result = script.content.replace(/\{\$([^{}\s$]+)\}/g, (match, placeholder) => {
		const value = placeholders[placeholder]
		return value !== undefined ? value : match
	})

	return result
}
