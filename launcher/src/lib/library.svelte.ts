// osrs-bot: personal script library state — favorites, recently ran and a
// works/broken verdict per script. Persisted to library.json via the Tauri
// store plugin so it survives restarts and travels with the install.
import { load as storeLoad, type Store } from "@tauri-apps/plugin-store"

export type ScriptVerdict = "works" | "broken"

class Library {
	favorites = $state<string[]>([])
	recents = $state<Record<string, number>>({})
	verdicts = $state<Record<string, ScriptVerdict>>({})
	#store: Store | null = null

	async init() {
		if (this.#store) return
		this.#store = await storeLoad("library.json", {
			autoSave: true,
			defaults: { favorites: [], recents: {}, verdicts: {} }
		})
		this.favorites = ((await this.#store.get("favorites")) as string[]) ?? []
		this.recents = ((await this.#store.get("recents")) as Record<string, number>) ?? {}
		this.verdicts = ((await this.#store.get("verdicts")) as Record<string, ScriptVerdict>) ?? {}
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
}

export const library = new Library()
