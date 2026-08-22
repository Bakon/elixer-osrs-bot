import styles from "./Switch.module.css"

export interface SwitchProps {
	checked: boolean
	onChange: (checked: boolean) => void
	"aria-label"?: string
}

export function Switch({ checked, onChange, ...rest }: SwitchProps) {
	return (
		<label className={styles.track} data-checked={checked ? "" : undefined}>
			<input
				type="checkbox"
				className={styles.input}
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				{...rest}
			/>
			<span className={styles.thumb} />
		</label>
	)
}
