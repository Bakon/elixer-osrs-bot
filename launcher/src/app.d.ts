import type { ProfileBase } from "$lib/types/collection"
import type { Store } from "@tauri-apps/plugin-store"

declare namespace App {
	// interface Locals {}
	interface PageData {
		profile: ProfileBase
		settings: Store
		dark: boolean
		theme: string
		sidebar: boolean
	}
}
