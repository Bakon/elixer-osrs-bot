import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
	plugins: [react()],
	publicDir: "static",
	build: {
		outDir: "build",
		target: "esnext"
	},
	// Tauri expects the dev server on a fixed port (see tauri.conf.json devUrl).
	server: {
		port: 1420,
		strictPort: true
	},
	clearScreen: false
})
