import { Link, useLocation } from "react-router-dom"
import { Gamepad2 } from "lucide-react"
import { channelManager } from "../lib/channels"
import { useStore } from "../lib/store"
import { getProfile } from "../lib/api"
import { Badge } from "../components/Badge"
import styles from "./Navigation.module.css"

export function Navigation() {
	useStore(channelManager)

	const avatarLetter = (getProfile().username?.[0] ?? "?").toUpperCase()
	const runningCount = Object.values(channelManager.channels).filter((c) => !c.stopped).length
	const onRunning = useLocation().pathname.startsWith("/running")

	return (
		<nav className={styles.nav}>
			<Link to="/scripts" className={styles.brand} aria-label="Navigate to home page">
				Elixer Scripts
			</Link>

			<div className={styles.actions}>
				{runningCount > 0 || onRunning ? (
					<Link
						to={onRunning ? "/scripts" : "/running"}
						className={styles.running}
						data-active={onRunning ? "" : undefined}
						aria-label="Show running scripts"
					>
						<Gamepad2 size={18} />
						Running
						{runningCount > 0 && <Badge color="primary" round>{runningCount}</Badge>}
					</Link>
				) : (
					<span className={styles.runningDisabled} title="No scripts running">
						<Gamepad2 size={18} />
						Running
					</span>
				)}

				<Link to="/settings" className={styles.avatarLink} aria-label="Open settings">
					<span className={styles.avatar}>{avatarLetter}</span>
				</Link>
			</div>
		</nav>
	)
}
