import { useEffect, useState, type ChangeEvent } from "react"
import { Navigate, useParams } from "react-router-dom"
import { EyeOff, Pencil, Star, ThumbsDown, ThumbsUp } from "lucide-react"
import { categorize, CATEGORIES } from "../../lib/categories"
import { defaultTitle } from "./display"
import { library } from "../../lib/library"
import { useStore } from "../../lib/store"
import { stemOf } from "../../lib/scripts"
import descriptions from "../../lib/script-descriptions.json"
import { useAppData } from "../../AppData"
import { Button } from "../../components/Button"
import { Badge } from "../../components/Badge"
import { Dialog } from "../../components/Dialog"
import { Input, Label, Select, Textarea } from "../../components/Field"
import { Markdown } from "../../components/Markdown"
import styles from "./ScriptDetail.module.css"

export function ScriptDetail() {
	const { scripts } = useAppData()
	const { slug } = useParams()
	useStore(library)

	// --- edit dialog -------------------------------------------------------
	const [editOpen, setEditOpen] = useState(false)
	const [editTitle, setEditTitle] = useState("")
	const [editCategory, setEditCategory] = useState("")
	const [editDescription, setEditDescription] = useState("")
	const [editImage, setEditImage] = useState("")

	// Remember the open script so the app reopens on it next time.
	useEffect(() => {
		if (slug && scripts.some((s) => s.id === slug)) library.setLastViewed(slug)
	}, [slug, scripts])

	const script = scripts.find((s) => s.id === slug)
	if (!script) return <Navigate to="/scripts" replace />

	const override = library.override(script.id)
	const title = override.title ?? defaultTitle(script)
	const category =
		(override.category && CATEGORIES[override.category]) || categorize(script.title, script.url)
	// Description precedence: user's own edit > generated-from-code default.
	const generated = (descriptions as Record<string, string>)[stemOf(script)] ?? ""
	const description = override.description ?? generated
	const isCustom = override.description != null
	const image = override.image ?? ""
	const verdict = library.verdicts[script.id]
	const favorite = library.isFavorite(script.id)

	function openEdit() {
		setEditTitle(override.title ?? defaultTitle(script!))
		setEditCategory(override.category ?? category.key)
		// Pre-fill with the generated description so the user edits from it.
		setEditDescription(override.description ?? generated)
		setEditImage(override.image ?? "")
		setEditOpen(true)
	}

	function pickImage(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return
		const reader = new FileReader()
		reader.onload = () => setEditImage(reader.result as string)
		reader.readAsDataURL(file)
	}

	async function saveEdit() {
		await library.setOverride(script!.id, {
			// store only what differs from the defaults
			title: editTitle.trim() === defaultTitle(script!) ? "" : editTitle.trim(),
			category: editCategory === categorize(script!.title, script!.url).key ? "" : editCategory,
			// don't persist an override that just equals the generated default
			description: editDescription.trim() === generated.trim() ? "" : editDescription.trim(),
			image: editImage
		})
		setEditOpen(false)
	}

	return (
		<>
			<div className={styles.header}>
				<div className={styles.imageBox}>
					{image ? (
						<img src={image} alt={title} className={styles.image} />
					) : (
						<div className={styles.imageFallback}>
							<img src={category.icon} alt={category.name} className={styles.fallbackIcon} />
							<span className={styles.fallbackName}>{category.name}</span>
						</div>
					)}
				</div>

				<div className={styles.meta}>
					<div className={styles.titleRow}>
						<h1 className={styles.title}>{title}</h1>
						<Button hoverBorder="primary" onClick={openEdit}>
							<Pencil size={16} /> Edit
						</Button>
					</div>

					<div className={styles.badges}>
						<Badge>
							<img src={category.icon} alt="" className={styles.badgeIcon} />
							{category.name}
						</Badge>
						<Badge>Revision {script.protected.revision}</Badge>
						<Badge color={verdict === "works" ? "success" : verdict === "broken" ? "error" : "surface"}>
							{verdict === "works" ? "Works" : verdict === "broken" ? "Broken" : "Untested"}
						</Badge>
					</div>

					<div className={styles.actions}>
						<Button
							preset={favorite ? "filled" : "outlined"}
							color="warning"
							hoverBorder={favorite ? undefined : "warning"}
							onClick={async () => await library.toggleFavorite(script.id)}
						>
							<Star size={16} fill={favorite ? "currentColor" : "none"} />
							{favorite ? "Favorited" : "Favorite"}
						</Button>
						<Button
							preset={verdict === "works" ? "filled" : "outlined"}
							color="success"
							hoverBorder={verdict === "works" ? undefined : "success"}
							onClick={async () => await library.setVerdict(script.id, "works")}
						>
							<ThumbsUp size={16} /> Works
						</Button>
						<Button
							preset={verdict === "broken" ? "filled" : "outlined"}
							color="error"
							hoverBorder={verdict === "broken" ? undefined : "error"}
							onClick={async () => await library.setVerdict(script.id, "broken")}
						>
							<ThumbsDown size={16} /> Broken
						</Button>
					</div>
				</div>
			</div>

			<div className={styles.description}>
				{description ? (
					<>
						{!isCustom && (
							<p className={styles.generatedNote}>
								Auto-generated from the script's code — edit to refine or correct it.
							</p>
						)}
						<Markdown source={description} />
					</>
				) : (
					<div className={styles.noDescription}>
						<p>No description yet.</p>
						<p className={styles.noDescriptionHint}>
							Add your own notes — what it does, setup, requirements — with the <b>Edit</b> button.
							Markdown works.
						</p>
						<Button preset="filled" onClick={openEdit}>
							Add a description
						</Button>
					</div>
				)}
			</div>

			<Dialog open={editOpen} onClose={() => setEditOpen(false)}>
				<h2 className={styles.dialogTitle}>Edit script</h2>

				<Label text="Name">
					<Input
						value={editTitle}
						placeholder={defaultTitle(script)}
						onChange={(e) => setEditTitle(e.target.value)}
					/>
				</Label>

				<Label text="Skill / category">
					<Select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
						{Object.values(CATEGORIES).map((c) => (
							<option key={c.key} value={c.key}>
								{c.name}
							</option>
						))}
					</Select>
				</Label>

				<Label text="Description (markdown — add setup, requirements, notes)">
					<Textarea
						className={styles.descriptionEdit}
						value={editDescription}
						onChange={(e) => setEditDescription(e.target.value)}
					/>
				</Label>

				<div>
					<span className={styles.imageLabel}>Image</span>
					<div className={styles.imageRow}>
						{editImage && <img src={editImage} alt="" className={styles.imagePreview} />}
						<input type="file" accept="image/*" onChange={pickImage} className={styles.imagePick} />
						{editImage && (
							<Button preset="tonal" onClick={() => setEditImage("")}>
								Remove
							</Button>
						)}
					</div>
				</div>

				<footer className={styles.dialogFooter}>
					<Button
						preset={library.isHidden(script.id) ? "filled" : "tonal"}
						color="surface"
						title="Hide this script from the list (reversible)"
						onClick={async () => {
							await library.toggleHidden(script.id)
							setEditOpen(false)
						}}
					>
						<EyeOff size={16} />
						{library.isHidden(script.id) ? "Unhide" : "Hide"}
					</Button>
					<div className={styles.dialogFooterRight}>
						<Button preset="tonal" onClick={() => setEditOpen(false)}>
							Cancel
						</Button>
						<Button preset="filled" onClick={saveEdit}>
							Save
						</Button>
					</div>
				</footer>
			</Dialog>
		</>
	)
}
