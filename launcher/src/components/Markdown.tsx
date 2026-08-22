import { useEffect, useState } from "react"
import { getRenderer } from "../lib/markdown"

export function Markdown({ source }: { source: string }) {
	const [html, setHtml] = useState("")

	useEffect(() => {
		let live = true
		getRenderer().then((renderer) => {
			if (live) setHtml(renderer.render(source))
		})
		return () => {
			live = false
		}
	}, [source])

	return <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />
}
