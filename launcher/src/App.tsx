import { useEffect, useState } from "react"
import { HashRouter, Navigate, Route, Routes } from "react-router-dom"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { getData } from "./lib/api"
import { library } from "./lib/library"
import { channelManager } from "./lib/channels"
import { AppDataContext, type AppData } from "./AppData"
import { AppShell } from "./shell/AppShell"
import { ScriptsLayout } from "./pages/scripts/ScriptsLayout"
import { ScriptsIndex } from "./pages/scripts/ScriptsIndex"
import { ScriptDetail } from "./pages/scripts/ScriptDetail"
import { RunningLayout } from "./pages/running/RunningLayout"
import { RunningIndex } from "./pages/running/RunningIndex"
import { RunningLog } from "./pages/running/RunningLog"
import { SettingsPage } from "./pages/settings/SettingsPage"

export function App() {
	const [data, setData] = useState<AppData | null>(null)
	const [initError, setInitError] = useState("")

	useEffect(() => {
		let disposed = false
		let unlisten: UnlistenFn | undefined

		;(async () => {
			await library.init()
			const [scripts, simbaPath] = await Promise.all([
				getData(),
				invoke<string>("get_executable_path", { exe: "simba" })
			])
			unlisten = await listen<string>("process-finished", (event) => {
				const channel = Number(event.payload)
				console.log(`Process finished: ${channel}`)
				channelManager.stopChannel(channel)
			})
			if (disposed) {
				unlisten()
				return
			}
			setData({ scripts, simbaPath })
		})().catch((e) => {
			console.error("init failed:", e)
			setInitError(String(e?.stack ?? e))
		})

		return () => {
			disposed = true
			unlisten?.()
		}
	}, [])

	if (initError) return <pre style={{ padding: "1rem", whiteSpace: "pre-wrap" }}>{initError}</pre>
	if (!data) return null

	return (
		<AppDataContext.Provider value={data}>
			<HashRouter>
				<Routes>
					<Route element={<AppShell />}>
						<Route path="/" element={<Navigate to="/scripts" replace />} />
						<Route path="/scripts" element={<ScriptsLayout />}>
							<Route index element={<ScriptsIndex />} />
							<Route path=":slug" element={<ScriptDetail />} />
						</Route>
						<Route path="/running" element={<RunningLayout />}>
							<Route index element={<RunningIndex />} />
							<Route path=":slug" element={<RunningLog />} />
						</Route>
						<Route path="/settings" element={<SettingsPage />} />
						<Route path="*" element={<Navigate to="/scripts" replace />} />
					</Route>
				</Routes>
			</HashRouter>
		</AppDataContext.Provider>
	)
}
