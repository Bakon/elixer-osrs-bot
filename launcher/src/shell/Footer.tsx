import { useEffect, useState } from "react"
import { matchPath, useLocation, useNavigate } from "react-router-dom"
import { invoke } from "@tauri-apps/api/core"
import { RefreshCw, SquaresSubtract } from "lucide-react"
import { channelManager } from "../lib/channels"
import { library } from "../lib/library"
import { useAppData } from "../AppData"
import { Button } from "../components/Button"
import { GithubButton } from "./GithubButton"
import { DiscordButton } from "./DiscordButton"
import styles from "./Footer.module.css"

interface ClientWindow {
	pid: number
	hwnd: number
	name: string
	title: string
}

export function Footer() {
	const { scripts } = useAppData()
	const navigate = useNavigate()
	const location = useLocation()

	const slug = matchPath("/scripts/:slug", location.pathname)?.params.slug
	const script = slug ? scripts.find((s) => s.id === slug) : undefined

	const [runError, setRunError] = useState("")
	const [client, setClient] = useState(-1)
	const [clients, setClients] = useState<ClientWindow[]>([])

	useEffect(() => {
		invoke<ClientWindow[]>("list_clients").then(setClients).catch(console.error)
	}, [])

	async function refreshClients() {
		setClient(-1)
		await invoke("set_client", {})
		try {
			setClients(await invoke<ClientWindow[]>("list_clients"))
		} catch (e) {
			console.error(e)
		}
	}

	async function execute(): Promise<number | null> {
		if (!script) return null
		// osrs-bot OFFLINE MODE: the script is already on disk (staged into
		// Simba/Scripts). Skip every server call — session token, version
		// lookup, storage download — and just run the local file.
		const args = [
			script.url, // path relative to Simba/Scripts, e.g. waspscripts.com/foo.simba
			"local", // Simba version -> use the local Simba build (no download)
			"none", // WaspLib -> use the local Includes copy (no download)
			script.id,
			script.protected.revision.toString(),
			"" // no refresh token offline
		]

		setRunError("")
		const clnt = clients[client]
		const channel = await channelManager.createChannel(
			script.title,
			clnt?.title || clnt?.name || "",
			clnt ?? null,
			args
		)
		try {
			await invoke("run_script", { args, channel })
		} catch (e) {
			// e.g. a different library generation is already running
			channelManager.stopChannel(channel.id)
			setRunError(String(e))
			return null
		}
		await library.recordRun(script.id)
		return channel.id
	}

	return (
		<>
			{runError && (
				<div className={styles.error}>
					<span>{runError}</span>
					<button
						className={styles.errorDismiss}
						onClick={() => setRunError("")}
						aria-label="Dismiss"
					>
						✕
					</button>
				</div>
			)}

			<footer className={styles.footer}>
				<div className={styles.social}>
					<GithubButton />
					<DiscordButton />
				</div>

				{script?.access && (
					<div className={styles.controls}>
						<div className={styles.clientGroup}>
							<button className={styles.cellBtn} onClick={refreshClients}>
								<span className={styles.cellLabel}>Refresh clients</span>
								<RefreshCw size={16} className={styles.refreshIcon} />
							</button>

							<button
								className={styles.cellBtn}
								disabled={client < 0}
								onClick={async () => await invoke("show_client")}
							>
								<span className={styles.cellLabel}>Show client</span>
								<SquaresSubtract size={16} />
							</button>

							<select
								id="client"
								className={styles.clientSelect}
								value={client}
								onChange={async (e) => {
									const idx = Number(e.target.value)
									setClient(idx)
									await invoke("set_client", { client: clients[idx] })
								}}
							>
								<option value={-1} disabled>
									Select a client
								</option>
								{clients.map((clnt, idx) => (
									<option key={idx} value={idx}>
										{clnt.title || clnt.name}
									</option>
								))}
							</select>
						</div>

						<Button
							preset="filled"
							color="primary"
							title="Open in Simba"
							disabled={client < 0}
							onClick={async () => {
								const id = await execute()
								if (id !== null) navigate("/running/" + id)
							}}
						>
							Run
						</Button>
					</div>
				)}
			</footer>
		</>
	)
}
