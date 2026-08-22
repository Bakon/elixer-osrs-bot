import markdownit from "markdown-it"
import { full as emoji } from "markdown-it-emoji"
import { imgLazyload } from "@mdit/plugin-img-lazyload"

// Shiki is heavy — load it (and build the renderer) once, on first use.
let rendererPromise: Promise<markdownit> | null = null

export function getRenderer(): Promise<markdownit> {
	rendererPromise ??= (async () => {
		const { default: Shiki } = await import("@shikijs/markdown-it")
		const shikiHighlighter = await Shiki({
			themes: { light: "github-light", dark: "github-dark" },
			langs: ["javascript", "typescript", "bash", "cmd", "yml", "yaml", "pascal", "java"]
		})

		return new markdownit("commonmark", {
			linkify: true,
			typographer: true
		})
			.use(shikiHighlighter)
			.use(emoji)
			.use(imgLazyload)
	})()
	return rendererPromise
}
