// Minimal observable base for the app's singleton stores (library, channels).
// Components subscribe with useStore(); any mutation bumps a version counter
// which useSyncExternalStore picks up, so fields can be read directly.
import { useSyncExternalStore } from "react"

export class Store {
	#listeners = new Set<() => void>()
	#version = 0

	subscribe = (listener: () => void) => {
		this.#listeners.add(listener)
		return () => {
			this.#listeners.delete(listener)
		}
	}

	get version() {
		return this.#version
	}

	protected emit() {
		this.#version++
		for (const listener of [...this.#listeners]) listener()
	}
}

export function useStore(store: Store) {
	useSyncExternalStore(store.subscribe, () => store.version)
}
