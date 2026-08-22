import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "./App"
import "./theme.css"

window.addEventListener("error", (e) => {
	document.title = "JS error"
	const el = document.createElement("pre")
	el.style.cssText = "padding:1rem;white-space:pre-wrap;color:#f66"
	el.textContent = String(e.error?.stack ?? e.message)
	document.body.appendChild(el)
})
window.addEventListener("unhandledrejection", (e) => {
	document.title = "Promise rejection"
	const el = document.createElement("pre")
	el.style.cssText = "padding:1rem;white-space:pre-wrap;color:#f66"
	el.textContent = String(e.reason?.stack ?? e.reason)
	document.body.appendChild(el)
})

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
)
