import { useEffect, useState } from "react"
import { Link, Outlet, useMatch, useNavigate } from "react-router-dom"
import { invoke } from "@tauri-apps/api/core"
import { Copy, RotateCcw, Square, X } from "lucide-react"
import { channelManager } from "../../lib/channels"
import { useStore } from "../../lib/store"
import { SearchInput } from "../../components/SearchInput"
import styles from "./RunningLayout.module.css"

function getRuntime(start: number, finish: number): string {
	const time = finish - start

	const totalSeconds = Math.floor(time / 1000)

	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60

	return `${hours.toString().padStart(2, "0")}:${minutes
		.toString()
		.padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

export function RunningLayout() {
	useStore(channelManager)
	const navigate = useNavigate()

	const match = useMatch("/running/:slug")
	const process = Number(match?.params.slug ?? NaN)
	const channel = channelManager.channels[process]

	const [search, setSearch] = useState("")
	const [runtime, setRuntime] = useState("00:00:00")

	const [stopped, running] = channelManager.processes.reduce<[number[], number[]]>(
		(acc, idx) => {
			if (channelManager.channels[idx]?.stopped) acc[0].push(idx)
			else acc[1].push(idx)
			return acc
		},
		[[], []]
	)

	const runningIdx = running.indexOf(process)
	const stoppedIdx = stopped.indexOf(process)
	const selected = runningIdx > -1 ? runningIdx : stoppedIdx === -1 ? 0 : stoppedIdx + running.length

	const hasProcesses = running.length > 0 || stopped.length > 0

	useEffect(() => {
		const interval = setInterval(() => {
			const entry = channelManager.channels[process]
			if (!entry) return
			setRuntime(getRuntime(entry.start, entry.stopped ? entry.finish : Date.now()))
		}, 1000)
		return () => clearInterval(interval)
	}, [process])

	// Realtime list of open game clients, so they show up (with RSN) even before
	// a script runs on them.
	const [liveClients, setLiveClients] = useState<{ pid: number; title: string; name: string }[]>([])
	useEffect(() => {
		let live = true
		async function refreshClients() {
			try {
				const clients = (await invoke("list_clients")) as { pid: number; title: string; name: string }[]
				if (live) setLiveClients(clients)
			} catch {
				/* ignore */
			}
		}
		refreshClients()
		const interval = setInterval(refreshClients, 3000)
		return () => {
			live = false
			clearInterval(interval)
		}
	}, [])

	// Group running/stopped processes by the client (RSN) they run on. Open
	// clients without a script yet still appear (as an empty group).
	const map = new Map<string, { running: number[]; stopped: number[] }>()
	const ensure = (k: string) => {
		if (!map.has(k)) map.set(k, { running: [], stopped: [] })
		return map.get(k)!
	}
	for (const c of liveClients) ensure(c.title || c.name || "Unknown client")
	for (const id of channelManager.processes) {
		const e = channelManager.channels[id]
		if (!e) continue
		// Client window titles change after login (RSN gets appended), so match
		// the channel to its live client by PID and group under the live title;
		// only fall back to the title captured at launch.
		const pid = (e.client as { pid?: number } | null)?.pid
		const live = pid ? liveClients.find((c) => c.pid === pid) : undefined
		const key = live
			? live.title || live.name || "Unknown client"
			: e.clientTitle || "Unknown client"
		const g = ensure(key)
		if (e.stopped) g.stopped.push(id)
		else g.running.push(id)
	}
	const groups = [...map.entries()].map(([title, v]) => ({ title, ...v }))

	// Re-run a stopped script on the same client it ran on before.
	async function restart(id: number) {
		const e = channelManager.channels[id]
		if (!e) return
		try {
			if (e.client) await invoke("set_client", { client: e.client })
			const ch = await channelManager.createChannel(e.name, e.clientTitle, e.client, e.args)
			await invoke("run_script", { args: e.args, channel: ch })
			channelManager.removeChannel(id)
			navigate("/running/" + ch.id)
		} catch (err) {
			console.error("restart failed:", err)
		}
	}

	return (
		<>
			<aside className={styles.sidebar}>
				<SearchInput value={search} onChange={setSearch} placeholder="Search script..." />

				<ul className={styles.list}>
					{groups.map((group) => (
						<li key={group.title}>
							<div className={styles.groupTitle} title={group.title}>
								{group.title}
							</div>
							<ul>
								{group.running.map((entry) => (
									<li
										key={entry}
										className={styles.rowRunning}
										data-selected={process === entry ? "" : undefined}
									>
										<Link to={`/running/${entry}`} className={styles.rowLink}>
											<span className={`${styles.dot} ${styles.dotRunning}`} />
											<span className={styles.truncate}>{channelManager.channels[entry].name}</span>
										</Link>
									</li>
								))}
								{group.stopped.map((entry) => (
									<li
										key={entry}
										className={styles.rowStopped}
										data-selected={process === entry ? "" : undefined}
									>
										<Link to={`/running/${entry}`} className={styles.rowLink}>
											<span className={`${styles.dot} ${styles.dotStopped}`} />
											<span className={styles.truncate}>{channelManager.channels[entry].name}</span>
										</Link>
										<button
											className={styles.restart}
											title="Restart this script on the same client"
											onClick={() => restart(entry)}
										>
											<RotateCcw size={14} />
										</button>
									</li>
								))}
								{group.running.length === 0 && group.stopped.length === 0 && (
									<li className={styles.groupEmpty}>no scripts running</li>
								)}
							</ul>
						</li>
					))}
				</ul>
			</aside>

			<main className={styles.main}>
				<div className={styles.wrapper}>
					{hasProcesses && (
						<div className={styles.controls}>
							<div className={styles.runtime}>{runtime}</div>
							<button
								className={styles.controlBtn}
								onClick={async () => {
									if (!channel) return
									const data = channelManager.getLogs(process)
									const lines = data.map((log) => {
										if (log.close) return log.text + "\n"
										return log.text + " "
									})
									await navigator.clipboard.writeText(lines.join(""))
								}}
							>
								<span>Copy</span>
								<Copy size={16} />
							</button>
							{selected < running.length ? (
								<button
									className={styles.controlBtn}
									onClick={async () => {
										const result = await invoke("kill_script", { id: running[selected] })
										console.log("kill_script: ", result)
									}}
								>
									<span>Stop</span>
									<Square size={16} />
								</button>
							) : (
								<button
									className={styles.controlBtn}
									onClick={() => {
										channelManager.removeChannel(stopped[selected - running.length])
										navigate("/running")
									}}
								>
									<span>Close</span>
									<X size={16} />
								</button>
							)}
						</div>
					)}

					<div
						id="running-container"
						className={styles.container}
						data-active={hasProcesses ? "" : undefined}
					>
						<Outlet />
					</div>
				</div>
			</main>
		</>
	)
}
