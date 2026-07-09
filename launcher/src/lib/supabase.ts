import type { ScriptEx } from "./types/collection"
import { invoke } from "@tauri-apps/api/core"

// --- osrs-bot OFFLINE MODE ---------------------------------------------
// Auth is stripped. We return a fake, always-logged-in "administrator" so the
// whole UI unlocks without any login. The admin role also makes every script
// show as owned (access: true) in the local catalog.
const OFFLINE_PROFILE: any = {
	id: "local",
	discord: null,
	stripe: null,
	username: "local",
	avatar: null,
	role: "administrator"
}

export async function getProfile() {
	return OFFLINE_PROFILE
}

export async function getData(): Promise<ScriptEx[]> {
	// The catalog is built from local .simba files by the Rust
	// `list_local_scripts` command. Every local script is marked accessible.
	try {
		return await invoke<ScriptEx[]>("list_local_scripts")
	} catch (e) {
		console.error("list_local_scripts failed:", e)
		return []
	}
}
