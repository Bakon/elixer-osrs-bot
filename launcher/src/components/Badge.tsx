import type { HTMLAttributes } from "react"
import styles from "./Badge.module.css"

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
	color?: "tonal" | "primary" | "success" | "error" | "surface"
	round?: boolean
}

export function Badge({ color = "tonal", round, className, ...rest }: BadgeProps) {
	return (
		<span
			className={className ? `${styles.badge} ${className}` : styles.badge}
			data-color={color}
			data-round={round ? "" : undefined}
			{...rest}
		/>
	)
}
