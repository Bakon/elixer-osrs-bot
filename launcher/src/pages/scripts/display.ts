// Title/category honor the user's local overrides; fall back to the
// filename-derived title and the inferred skill category.
import { categorize, CATEGORIES, type Category } from "../../lib/categories"
import { library } from "../../lib/library"
import type { ScriptEx } from "../../lib/types/collection"

// Default titles come from the filename, which often leads with the original
// author's handle ("Bigaussie Gemstone Crab Slayer", "Students Wines") — strip
// that so everything reads as an Elixer script.
export function defaultTitle(s: ScriptEx): string {
	const author = s.protected.username.trim().toLowerCase()
	const words = s.title.split(" ")
	const first = (words[0] ?? "").toLowerCase()
	if (author && words.length > 1 && (first.startsWith(author) || author.startsWith(first))) {
		return words.slice(1).join(" ")
	}
	return s.title
}

export function displayTitle(s: ScriptEx): string {
	return library.override(s.id).title ?? defaultTitle(s)
}

export function displayCategory(s: ScriptEx): Category {
	const ov = library.override(s.id).category
	return (ov && CATEGORIES[ov]) || categorize(s.title, s.url)
}
