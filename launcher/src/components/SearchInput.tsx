import { Search } from "lucide-react"
import styles from "./SearchInput.module.css"

export interface SearchInputProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
	return (
		<div className={styles.group}>
			<div className={styles.icon}>
				<Search size={16} />
			</div>
			<input
				type="text"
				className={styles.input}
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
		</div>
	)
}
