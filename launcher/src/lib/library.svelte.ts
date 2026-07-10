// osrs-bot: personal script library state — favorites, recently ran, a
// works/broken verdict, and user-authored metadata overrides per script.
// Persisted to library.json via the Tauri store plugin so it survives
// restarts and travels with the install.
//
// The overrides matter because the rich script descriptions / requirements
// used to live on the (now-dead) WaspScripts server — they are NOT in the
// local .simba files. So the user re-authors them here and they stick.
import { load as storeLoad, type Store } from "@tauri-apps/plugin-store"

export type ScriptVerdict = "works" | "broken"

export interface ScriptOverride {
	title?: string
	description?: string // markdown
	image?: string // data URL
	category?: string // category key from categories.ts
}

class Library {
	favorites = $state<string[]>([])
	recents = $state<Record<string, number>>({})
	verdicts = $state<Record<string, ScriptVerdict>>({})
	overrides = $state<Record<string, ScriptOverride>>({})
	#store: Store | null = null

	async init() {
		if (this.#store) return
		this.#store = await storeLoad("library.json", {
			autoSave: true,
			defaults: { favorites: [], recents: {}, verdicts: {}, overrides: {} }
		})
		this.favorites = ((await this.#store.get("favorites")) as string[]) ?? []
		this.recents = ((await this.#store.get("recents")) as Record<string, number>) ?? {}
		this.verdicts = ((await this.#store.get("verdicts")) as Record<string, ScriptVerdict>) ?? {}
		this.overrides = ((await this.#store.get("overrides")) as Record<string, ScriptOverride>) ?? {}
	}

	isFavorite(id: string) {
		return this.favorites.includes(id)
	}

	async toggleFavorite(id: string) {
		this.favorites = this.isFavorite(id)
			? this.favorites.filter((f) => f !== id)
			: [...this.favorites, id]
		await this.#store?.set("favorites", this.favorites)
	}

	async recordRun(id: string) {
		this.recents = { ...this.recents, [id]: Date.now() }
		await this.#store?.set("recents", this.recents)
	}

	async setVerdict(id: string, verdict: ScriptVerdict) {
		const next = { ...this.verdicts }
		if (next[id] === verdict) {
			delete next[id] // clicking the active verdict clears it
		} else {
			next[id] = verdict
		}
		this.verdicts = next
		await this.#store?.set("verdicts", this.verdicts)
	}

	override(id: string): ScriptOverride {
		return this.overrides[id] ?? {}
	}

	async setOverride(id: string, patch: ScriptOverride) {
		const merged = { ...this.override(id), ...patch }
		// Drop empty strings so we fall back to the inferred/default values.
		for (const k of Object.keys(merged) as (keyof ScriptOverride)[]) {
			if (!merged[k]) delete merged[k]
		}
		this.overrides = { ...this.overrides, [id]: merged }
		await this.#store?.set("overrides", this.overrides)
	}
}

export const library = new Library()
