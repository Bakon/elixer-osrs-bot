import type {
	InputHTMLAttributes,
	LabelHTMLAttributes,
	ReactNode,
	SelectHTMLAttributes,
	TextareaHTMLAttributes
} from "react"
import styles from "./Field.module.css"

export function Label({
	text,
	children,
	...rest
}: LabelHTMLAttributes<HTMLLabelElement> & { text: string; children: ReactNode }) {
	return (
		<label className={styles.label} {...rest}>
			<span className={styles.labelText}>{text}</span>
			{children}
		</label>
	)
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
	return <input className={className ? `${styles.input} ${className}` : styles.input} {...rest} />
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select className={className ? `${styles.input} ${className}` : styles.input} {...rest} />
	)
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return (
		<textarea
			className={className ? `${styles.textarea} ${className}` : styles.textarea}
			{...rest}
		/>
	)
}
