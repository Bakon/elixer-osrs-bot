import { Link, Navigate } from "react-router-dom"
import { channelManager } from "../../lib/channels"
import { useStore } from "../../lib/store"
import styles from "./RunningIndex.module.css"

export function RunningIndex() {
	useStore(channelManager)

	if (channelManager.processes.length > 0) {
		return <Navigate to={`/running/${channelManager.processes[0]}`} replace />
	}

	return (
		<div className={styles.empty}>
			<div className={styles.message}>
				<p>There's no processes running!</p>
				<p>You can see console output here when you have scripts running.</p>
			</div>

			<Link to="/scripts" className={styles.back}>
				Back
			</Link>
		</div>
	)
}
