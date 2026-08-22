import { Outlet } from "react-router-dom"
import { Navigation } from "./Navigation"
import { Footer } from "./Footer"
import styles from "./AppShell.module.css"

// Self-contained viewport-height flex column: the app never scrolls at the
// document level — every region manages its own internal scrolling.
export function AppShell() {
	return (
		<div className={styles.shell}>
			<div className={styles.edge}>
				<Navigation />
			</div>
			<main className={styles.main}>
				<Outlet />
			</main>
			<div className={styles.edge}>
				<Footer />
			</div>
		</div>
	)
}
