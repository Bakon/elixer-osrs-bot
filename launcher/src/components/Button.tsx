import type { ButtonHTMLAttributes } from "react"
import styles from "./Button.module.css"

export type ButtonColor = "primary" | "success" | "warning" | "error" | "surface"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	/** filled = solid color, outlined = surface border, tonal = subtle fill, ghost = nothing until hover */
	preset?: "filled" | "outlined" | "tonal" | "ghost"
	/** fill color for preset="filled" */
	color?: ButtonColor
	/** for preset="outlined": color the border on hover instead of the tonal fill */
	hoverBorder?: ButtonColor
	size?: "xs" | "sm" | "md" | "lg"
	/** square icon-only button */
	icon?: boolean
	grow?: boolean
	justify?: "start" | "center"
}

export function Button({
	preset = "outlined",
	color = "primary",
	hoverBorder,
	size = "md",
	icon,
	grow,
	justify = "center",
	className,
	...rest
}: ButtonProps) {
	return (
		<button
			className={className ? `${styles.btn} ${className}` : styles.btn}
			data-preset={preset}
			data-color={color}
			data-hover-border={hoverBorder}
			data-size={size}
			data-icon={icon ? "" : undefined}
			data-grow={grow ? "" : undefined}
			data-justify={justify}
			{...rest}
		/>
	)
}
