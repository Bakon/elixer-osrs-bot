import { useMemo, useState } from "react"
import { Link, Outlet } from "react-router-dom"
import { ChevronDown, ChevronUp, Filter, Star, X } from "lucide-react"
import { CATEGORIES, ORDERED_CATEGORIES } from "../../lib/categories"
import { library } from "../../lib/library"
import { useStore } from "../../lib/store"
import { isUtility } from "../../lib/scripts"
import type { ScriptEx } from "../../lib/types/collection"
import { useAppData } from "../../AppData"
import { Button } from "../../components/Button"
import { SearchInput } from "../../components/SearchInput"
import { displayCategory, displayTitle } from "./display"
import styles from "./ScriptsLayout.module.css"

type ListFilter = "all" | "favorites" | "broken" | "hidden"

const FILTER_TABS: { key: ListFilter; label: string }[] = [
	{ key: "favorites", label: "★ Favorites" },
	{ key: "all", label: "All" }
]

const EMPTY_MESSAGES: Record<ListFilter, string> = {
	all: "No scripts found.",
	favorites: "No favorites yet — click the ★ next to a script.",
	broken: "No broken scripts.",
	hidden: "No hidden scripts."
}

export function ScriptsLayout() {
	const { scripts } = useAppData()
	useStore(library)

	const [search, setSearch] = useState("")
	const [filter, setFilter] = useState<ListFilter>("all")
	const [skillFilter, setSkillFilter] = useState<string | null>(null) // category key, or null = all skills
	const [skillOpen, setSkillOpen] = useState(false)

	// Which skills actually have scripts, with counts — for the skill picker.
	const skillCounts = useMemo(() => {
		const counts: Record<string, number> = {}
		for (const s of scripts) {
			if (isUtility(s) || library.isHidden(s.id)) continue
			const key = displayCategory(s).key
			counts[key] = (counts[key] ?? 0) + 1
		}
		return counts
	}, [scripts, library.version])

	const q = search.trim().toLowerCase()
	let filtered = scripts.filter((s) => {
		if (isUtility(s)) return false // setup tools live under Settings
		if (filter === "hidden") {
			if (!library.isHidden(s.id)) return false
		} else if (library.isHidden(s.id)) {
			return false
		}
		// All = every script; the works/broken verdict is only a per-script
		// indicator, not a filter. Broken has its own tab for convenience.
		if (filter === "broken" && library.verdicts[s.id] !== "broken") return false
		if (skillFilter && displayCategory(s).key !== skillFilter) return false
		if (!q) return true
		return (
			displayTitle(s).toLowerCase().includes(q) ||
			displayCategory(s).name.toLowerCase().includes(q)
		)
	})
	if (filter === "favorites") {
		filtered = filtered
			.filter((s) => library.isFavorite(s.id))
			.sort((a, b) => library.favoriteRank(a.id) - library.favoriteRank(b.id))
	} else {
		filtered = filtered.sort((a, b) => displayTitle(a).localeCompare(displayTitle(b)))
	}

	function pickSkill(key: string | null) {
		setSkillFilter(key)
		setSkillOpen(false)
	}

	return (
		<>
			<aside className={styles.sidebar}>
				<SearchInput value={search} onChange={setSearch} placeholder="Search script or skill..." />

				<div className={styles.tabs}>
					{FILTER_TABS.map((tab) => (
						<Button
							key={tab.key}
							size="xs"
							grow
							preset={filter === tab.key ? "filled" : "outlined"}
							onClick={() => setFilter(tab.key)}
						>
							{tab.label}
						</Button>
					))}
					{Object.values(library.verdicts).includes("broken") && (
						<Button
							size="xs"
							preset={filter === "broken" ? "filled" : "outlined"}
							title="Scripts marked broken"
							onClick={() => setFilter("broken")}
						>
							Broken
						</Button>
					)}
					{library.hidden.length > 0 && (
						<Button
							size="xs"
							preset={filter === "hidden" ? "filled" : "outlined"}
							title="Hidden scripts"
							onClick={() => setFilter("hidden")}
						>
							Hidden
						</Button>
					)}
				</div>

				{/* Skill filter: expands into an OSRS-order icon grid under the button */}
				<div className={styles.skillFilter}>
					<div className={styles.skillFilterRow}>
						<Button
							size="sm"
							grow
							justify="start"
							preset={skillFilter ? "filled" : "outlined"}
							onClick={() => setSkillOpen(!skillOpen)}
						>
							{skillFilter ? (
								<>
									<img src={CATEGORIES[skillFilter].icon} alt="" className={styles.skillIcon} />
									<span className={styles.truncate}>{CATEGORIES[skillFilter].name}</span>
								</>
							) : (
								<>
									<Filter size={14} />
									<span>Filter by skill</span>
								</>
							)}
						</Button>
						{skillFilter && (
							<Button size="sm" icon title="Clear skill filter" onClick={() => pickSkill(null)}>
								<X size={14} />
							</Button>
						)}
					</div>

					{skillOpen && (
						/* 3 columns, OSRS panel order — compact: icon only, name/count in tooltip */
						<div className={styles.skillGrid}>
							{ORDERED_CATEGORIES.map((cat) => {
								const count = skillCounts[cat.key] ?? 0
								return (
									<button
										key={cat.key}
										className={styles.skillCell}
										data-active={skillFilter === cat.key ? "" : undefined}
										disabled={count === 0}
										title={`${cat.name} (${count})`}
										onClick={() => pickSkill(cat.key)}
									>
										<img src={cat.icon} alt={cat.name} className={styles.skillGridIcon} />
									</button>
								)
							})}
						</div>
					)}
				</div>

				<ul className={styles.list}>
					{filtered.length === 0 ? (
						<li className={styles.empty}>{EMPTY_MESSAGES[filter]}</li>
					) : (
						filtered.map((script) => (
							<Row key={script.id} script={script} showReorder={filter === "favorites"} />
						))
					)}
				</ul>
			</aside>

			<div className={styles.content}>
				<Outlet />
			</div>
		</>
	)
}

function Row({ script, showReorder }: { script: ScriptEx; showReorder: boolean }) {
	const cat = displayCategory(script)
	const verdict = library.verdicts[script.id]
	const favorite = library.isFavorite(script.id)

	return (
		<li className={styles.row}>
			<Link to={`/scripts/${script.id}`} className={styles.rowLink}>
				<span className={styles.rowMain}>
					<img src={cat.icon} alt={cat.name} title={cat.name} className={styles.rowSkill} />
					<span
						className={styles.dot}
						data-verdict={verdict ?? "untested"}
						title={verdict === "works" ? "Works" : verdict === "broken" ? "Broken" : "Not tested"}
					/>
					<span className={styles.truncate}>{displayTitle(script)}</span>
				</span>
				<span className={styles.rowActions}>
					{showReorder && (
						<span className={styles.reorder}>
							<button
								className={styles.reorderBtn}
								title="Move up"
								disabled={library.favoriteRank(script.id) === 0}
								onClick={async (e) => {
									e.preventDefault()
									e.stopPropagation()
									await library.moveFavorite(script.id, -1)
								}}
							>
								<ChevronUp size={13} />
							</button>
							<button
								className={styles.reorderBtn}
								title="Move down"
								disabled={library.favoriteRank(script.id) === library.favorites.length - 1}
								onClick={async (e) => {
									e.preventDefault()
									e.stopPropagation()
									await library.moveFavorite(script.id, 1)
								}}
							>
								<ChevronDown size={13} />
							</button>
						</span>
					)}
					<button
						className={styles.star}
						data-active={favorite ? "" : undefined}
						title={favorite ? "Unfavorite" : "Favorite"}
						onClick={async (e) => {
							e.preventDefault()
							e.stopPropagation()
							await library.toggleFavorite(script.id)
						}}
					>
						<Star size={14} fill={favorite ? "currentColor" : "none"} />
					</button>
				</span>
			</Link>
		</li>
	)
}
