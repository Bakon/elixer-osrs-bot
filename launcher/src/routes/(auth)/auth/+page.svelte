<script lang="ts">
	import { invoke } from "@tauri-apps/api/core"
	import { openUrl } from "@tauri-apps/plugin-opener"
	import { listen } from "@tauri-apps/api/event"
	import { invalidate } from "$app/navigation"
	import Discord from "$lib/components/Discord.svelte"
	import Logo from "./Logo.svelte"
	import { getUser } from "$lib/supabase"

	let { data } = $props()
	let { supabase } = $derived(data)

	function waitForOAuth(): Promise<{ code?: string; error?: string }> {
		return new Promise((resolve) => {
			const unlisten = listen("oauth-callback", (event) => {
				const { code, error } = event.payload as { code?: string; error?: string }
				unlisten.then((fn) => fn()) // stop listening after first event
				resolve({ code, error })
			})
		})
	}

	async function doLogin() {
		console.log("Logging in with discord...")
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: "discord",
			options: { skipBrowserRedirect: true, redirectTo: `http://localhost:5217/` }
		})

		if (error) {
			console.error(error)
			return
		}

		await invoke("start_server")
		await openUrl(data.url)

		const { code, error: oauthErr } = await waitForOAuth()

		console.log("OAuth code:", code)

		if (!code || oauthErr) {
			console.error("OAuth error:", oauthErr)
			return
		}

		const {
			data: { user },
			error: err
		} = await supabase.auth.exchangeCodeForSession(code)

		if (err) {
			console.error(err)
			return
		}

		return user
	}

	async function checkProfile(id: string) {
		const { count } = await supabase
			.schema("profiles")
			.from("profiles")
			.select("*", { count: "exact", head: true })
			.eq("id", id)
			.single()

		if (count) return true
		return false
	}

	async function login() {
		let user = await getUser()

		if (!user) {
			user = (await doLogin()) ?? null
			if (!user) {
				console.error("Failed to get user.")
				return
			}
		}

		let result = await checkProfile(user.id)
		if (result) {
			await invalidate("root:layout")
			return
		}

		await invoke("sign_up", { id: user.id })

		result = await checkProfile(user.id)
		if (result) {
			await invalidate("root:layout")
			return
		}
	}
</script>

<main class="container mx-auto flex h-screen items-center justify-center">
	<div class="mx-auto my-24 flex flex-col">
		<Logo />
		<form class="mx-auto my-32" onsubmit={async () => await login()}>
			<button type="submit" class="btn preset-filled-surface-300-700 p-4 hover:preset-tonal">
				<Discord />
				<span class="text-lg"> Login with Discord </span>
			</button>
		</form>
	</div>
</main>
