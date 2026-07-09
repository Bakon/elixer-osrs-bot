import type { Role, Script, ScriptEx } from "./types/collection"
import type { Database } from "./types/supabase"
import { createClient, type User } from "@supabase/supabase-js"
import { invoke } from "@tauri-apps/api/core"

export const DATABASE_URL = "https://db.waspscripts.dev/"

export const supabase = createClient<Database>(
	DATABASE_URL,
	"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1MTA0MTIwMCwiZXhwIjo0OTA2NzE0ODAwLCJyb2xlIjoiYW5vbiJ9.C_KW5x45BpIyOQrnZc7CKYKjHe0yxB4l-fTSC4z_kYY",
	{
		auth: {
			persistSession: true,
			storageKey: "waspscripts-auth",
			storage: window.localStorage,
			detectSessionInUrl: true,
			flowType: "pkce"
		}
	}
)

// --- bakon-bot OFFLINE MODE ---------------------------------------------
// Auth is stripped. We return a fake, always-logged-in "administrator" so the
// whole UI unlocks with no waspscripts.com login. The admin role also makes
// every script show as owned (access: true) down in getData().
const OFFLINE_USER: any = { id: "bakon-local", email: "local@bakon-bot", aud: "authenticated" }
const OFFLINE_SESSION: any = {
	access_token: "offline",
	refresh_token: "offline",
	token_type: "bearer",
	expires_in: 999999999,
	user: OFFLINE_USER
}
const OFFLINE_PROFILE: any = {
	id: "bakon-local",
	discord: null,
	stripe: null,
	username: "bakon",
	avatar: null,
	role: "administrator"
}

export async function refreshSession() {
	/* offline: no-op */
}

export async function getSession() {
	return OFFLINE_SESSION
}

export async function getUser() {
	return OFFLINE_USER
}

export async function getProfile(_userPromise: Promise<User | null>) {
	return OFFLINE_PROFILE
}

export async function getSubscriptions(userID: string) {
	const { data, error: err } = await supabase
		.schema("profiles")
		.from("subscriptions")
		.select("product, price, date_start, date_end, cancel, disabled")
		.eq("user_id", userID)
		.gte("date_end", new Date().toISOString())

	if (err) return []
	return data
}

export async function getFreeAccess(userID: string) {
	const { data, error: err } = await supabase
		.schema("profiles")
		.from("free_access")
		.select("product, date_start, date_end")
		.eq("user_id", userID)
		.gte("date_end", new Date().toISOString())

	if (err) return []
	return data
}

export async function getBundles() {
	const { data, error: err } = await supabase
		.schema("scripts")
		.from("bundles")
		.select("id, author, name, scripts, username, avatar")
		.order("name")

	if (err) {
		console.error(err)
		return []
	}

	return data
}

export async function getProducts() {
	const { data, error: err } = await supabase
		.schema("stripe")
		.from("products")
		.select("id, user_id, bundle, script, name, username, avatar")
		.order("name")
		.eq("active", true)

	if (err) {
		console.error(err)
		return []
	}

	return data
}

export async function getScripts(role: Role) {
	let query = supabase
		.schema("scripts")
		.from("scripts")
		.select(
			`id, url, title, description, content, published,
			protected!left (username, avatar, revision, updated_at),
			metadata!left (status, type, stage)`
		)

	if (role != "tester" && role != "scripter" && role != "moderator" && role != "administrator") {
		query = query.eq("published", true)
	}

	const { data, error: err } = await query.order("title").overrideTypes<Script[]>()

	if (err) {
		console.error(err)
		return []
	}

	return data
}

export async function getData(_profile?: unknown): Promise<ScriptEx[]> {
	// bakon-bot OFFLINE MODE: the catalog is built from local .simba files by
	// the Rust `list_local_scripts` command, not from waspscripts.com. Every
	// local script is marked accessible.
	try {
		return await invoke<ScriptEx[]>("list_local_scripts")
	} catch (e) {
		console.error("list_local_scripts failed:", e)
		return []
	}
}
