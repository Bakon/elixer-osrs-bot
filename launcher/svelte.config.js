// Tauri doesn't have a Node.js server to do proper SSR
// so we will use adapter-static to prerender the app (SSG)
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
import adapter from "@sveltejs/adapter-static"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ fallback: "error.html" }),
		csp: {
			mode: "auto",
			directives: {
				"connect-src": [
					"self",
					"http://tauri.localhost",
					"http://localhost:*",
					"http://ipc.localhost",
					"https://waspscripts.dev",
					"https://db.waspscripts.dev",
					"https://api.waspscripts.dev",
					"ws://localhost:*",
					"ws://db.waspscripts.dev",
					"wss://db.waspscripts.dev"
				]
			}
		}
	}
}

export default config
