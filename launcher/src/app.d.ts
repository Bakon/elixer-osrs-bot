import type { ProfileBase, ProfileRoles, Subscription, FreeAccess } from "$lib/types/collection"
import type { Database } from "$lib/types/supabase"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"
import type { Store } from "@tauri-apps/plugin-store"

declare namespace App {
	// interface Locals {}
	interface PageData {
		supabase: SupabaseClient<Database>
		session: Session | null
		user: User
		profile: ProfileBase
		settings: Store
		dark: boolean
		theme: string
		sidebar: boolean
	}
}
