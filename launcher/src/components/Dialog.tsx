import { useEffect, useRef, type ReactNode } from "react"
import styles from "./Dialog.module.css"

export interface DialogProps {
	open: boolean
	/** fired when the dialog closes itself (Esc) — keep `open` in sync */
	onClose: () => void
	children: ReactNode
}

export function Dialog({ open, onClose, children }: DialogProps) {
	const ref = useRef<HTMLDialogElement>(null)

	useEffect(() => {
		const dialog = ref.current
		if (!dialog) return
		if (open && !dialog.open) dialog.showModal()
		else if (!open && dialog.open) dialog.close()
	}, [open])

	return (
		<dialog ref={ref} className={styles.dialog} onClose={onClose}>
			{children}
		</dialog>
	)
}
