// osrs-bot: infer the RuneScape skill a script trains from its title/filename.
// Pure keyword heuristics — local scripts carry no category metadata. First
// match wins, so more specific patterns go first.
//
// `icon` is a path under static/skills/ (real OSRS wiki skill icons, bundled
// locally so nothing is fetched at runtime). `key` is the stable id used when
// the user overrides a script's category.

export interface Category {
	key: string
	name: string
	icon: string
}

export const CATEGORIES: Record<string, Category> = {
	attack: { key: "attack", name: "Attack", icon: "/skills/Attack.png" },
	strength: { key: "strength", name: "Strength", icon: "/skills/Strength.png" },
	defence: { key: "defence", name: "Defence", icon: "/skills/Defence.png" },
	hitpoints: { key: "hitpoints", name: "Hitpoints", icon: "/skills/Hitpoints.png" },
	ranged: { key: "ranged", name: "Ranged", icon: "/skills/Ranged.png" },
	prayer: { key: "prayer", name: "Prayer", icon: "/skills/Prayer.png" },
	magic: { key: "magic", name: "Magic", icon: "/skills/Magic.png" },
	runecrafting: { key: "runecrafting", name: "Runecraft", icon: "/skills/Runecraft.png" },
	construction: { key: "construction", name: "Construction", icon: "/skills/Construction.png" },
	agility: { key: "agility", name: "Agility", icon: "/skills/Agility.png" },
	herblore: { key: "herblore", name: "Herblore", icon: "/skills/Herblore.png" },
	thieving: { key: "thieving", name: "Thieving", icon: "/skills/Thieving.png" },
	crafting: { key: "crafting", name: "Crafting", icon: "/skills/Crafting.png" },
	fletching: { key: "fletching", name: "Fletching", icon: "/skills/Fletching.png" },
	slayer: { key: "slayer", name: "Slayer", icon: "/skills/Slayer.png" },
	hunter: { key: "hunter", name: "Hunter", icon: "/skills/Hunter.png" },
	mining: { key: "mining", name: "Mining", icon: "/skills/Mining.png" },
	smithing: { key: "smithing", name: "Smithing", icon: "/skills/Smithing.png" },
	fishing: { key: "fishing", name: "Fishing", icon: "/skills/Fishing.png" },
	cooking: { key: "cooking", name: "Cooking", icon: "/skills/Cooking.png" },
	firemaking: { key: "firemaking", name: "Firemaking", icon: "/skills/Firemaking.png" },
	woodcutting: { key: "woodcutting", name: "Woodcutting", icon: "/skills/Woodcutting.png" },
	farming: { key: "farming", name: "Farming", icon: "/skills/Farming.png" },
	sailing: { key: "sailing", name: "Sailing", icon: "/skills/Sailing.png" },
	// Not real skills, appended after the panel for scripts that don't map to one.
	minigame: { key: "minigame", name: "Minigame", icon: "/skills/Minigame.png" },
	questing: { key: "questing", name: "Questing", icon: "/skills/Quest_point.png" },
	misc: { key: "misc", name: "Misc", icon: "/skills/Stats.png" }
}

// Exact in-game OSRS skills-panel order (row-major, 3 columns), then the two
// non-skill buckets.
export const CATEGORY_ORDER = [
	"attack", "hitpoints", "mining",
	"strength", "agility", "smithing",
	"defence", "herblore", "fishing",
	"ranged", "thieving", "cooking",
	"prayer", "crafting", "firemaking",
	"magic", "fletching", "woodcutting",
	"runecrafting", "slayer", "farming",
	"construction", "hunter", "sailing",
	"minigame", "questing", "misc"
]

export const ORDERED_CATEGORIES = CATEGORY_ORDER.map((k) => CATEGORIES[k])

const PATTERNS: { pattern: RegExp; key: string }[] = [
	{ pattern: /super.?combat|potion|clean herb|herblore/, key: "herblore" },
	{ pattern: /runecraft|zmi|ourania|abyss|gotr|guardians of the rift/, key: "runecrafting" },
	{ pattern: /woodcut|chop|forestry|treechopper/, key: "woodcutting" },
	{ pattern: /superheat|smith|smelt|blast furnace|cannonball|anvil/, key: "smithing" },
	{ pattern: /min(e|er|ing)|motherlode|shooting star|amethyst|quarry|barronite|basalt|calcified/, key: "mining" },
	{ pattern: /fish|tempoross|karambwan|seagull/, key: "fishing" },
	{ pattern: /cook|wine/, key: "cooking" },
	{ pattern: /wintertodt|firemak|log.?burner/, key: "firemaking" },
	{ pattern: /fletch/, key: "fletching" },
	{ pattern: /superglass|tab maker|spell|magic|alch|enchant|splash|lunar|plank make|teleport/, key: "magic" },
	{ pattern: /pray|bones|ecto|gilded altar|offerer/, key: "prayer" },
	{ pattern: /agility|rooftop|sepulchre|roofhopper/, key: "agility" },
	{ pattern: /thiev|pickpocket|stall|glassblow/, key: "thieving" },
	// Minigames that don't train one clear skill (skill-training minigames like
	// Wintertodt/NMZ stay under their skill above).
	{ pattern: /chompy|trouble brewing|minigame/, key: "minigame" },
	{ pattern: /hunt|birdhouse|chinchompa|salamander|kebbit|bird catcher/, key: "hunter" },
	{ pattern: /farm|tithe|herb run|hardwood/, key: "farming" },
	{ pattern: /construction|mahogany home|builder/, key: "construction" },
	{ pattern: /slayer|kraken|nightmare zone|\bnmz\b|crab|seagull slayer/, key: "slayer" },
	{ pattern: /quest/, key: "questing" },
	{ pattern: /craft|jewelry|jewellery|tanner|gem|hide/, key: "crafting" },
	{ pattern: /combat|fight|dream|bandit|splasher|barrows|knights|warrior/, key: "attack" }
]

export function categorize(title: string, url = ""): Category {
	const haystack = (title + " " + url).toLowerCase()
	for (const { pattern, key } of PATTERNS) {
		if (pattern.test(haystack)) return CATEGORIES[key]
	}
	return CATEGORIES.misc
}
