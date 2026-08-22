import { useEffect } from "react"
import { Navigate, useParams } from "react-router-dom"
import { channelManager } from "../../lib/channels"
import { useStore } from "../../lib/store"
import styles from "./RunningLog.module.css"

export function RunningLog() {
	useStore(channelManager)
	const { slug } = useParams()
	const process = Number(slug)
	const channel = channelManager.channels[process]
	const logs = channelManager.getLogs(process)

	// Keep the shared scroll container pinned to the bottom as logs stream in.
	useEffect(() => {
		const container = document.getElementById("running-container")
		if (container) container.scrollTop = container.scrollHeight
	})

	if (!channel) return <Navigate to="/running" replace />

	return (
		<div className={styles.log}>
			{logs.map((log, i) => (
				<span key={i}>
					<span style={{ color: `#${log.color}` }}>{log.text}</span>
					{log.close && <br />}
				</span>
			))}
		</div>
	)
}
