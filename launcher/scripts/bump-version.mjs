// Bumps the patch version in package.json. Runs as part of
// beforeBuildCommand so every `tauri build` produces a new version — the
// About page (via getVersion()) always reflects the actual build.
import { readFileSync, writeFileSync } from "node:fs"

const path = new URL("../package.json", import.meta.url)
const raw = readFileSync(path, "utf8")
const pkg = JSON.parse(raw)

const [maj, min, pat] = pkg.version.split(".").map(Number)
pkg.version = `${maj}.${min}.${pat + 1}`

// Preserve the file's tab-indent + CRLF style.
writeFileSync(path, JSON.stringify(pkg, null, "\t").replace(/\n/g, "\r\n") + "\r\n")
console.log("elixer-launcher version ->", pkg.version)
