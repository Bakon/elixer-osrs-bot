// osrs-bot: infer the RuneScape skill/activity a script trains from its
// title/filename. Pure keyword heuristics — local scripts carry no category
// metadata. First match wins, so more specific patterns go first.
//
// `icon` is a path under static/skills/ (real OSRS wiki skill icons, bundled
// locally so nothing is fetched at runtime). `key` is the stable category id
// used when the user overrides a script's category.

export interface Category {
	key: string
	name: string
	icon: string
}

export const CATEGORIES: Record<string, Category> = {
	runecrafting: { key: "runecrafting", name: "Runecrafting", icon: "/skills/Runecraft.png" },
	woodcutting: { key: "woodcutting", name: "Woodcutting", icon: "/skills/Woodcutting.png" },
	mining: { key: "mining", name: "Mining", icon: "/skills/Mining.png" },
	fishing: { key: "fishing", name: "Fishing", icon: "/skills/Fishing.png" },
	cooking: { key: "cooking", name: "Cooking", icon: "/skills/Cooking.png" },
	firemaking: { key: "firemaking", name: "Firemaking", icon: "/skills/Firemaking.png" },
	fletching: { key: "fletching", name: "Fletching", icon: "/skills/Fletching.png" },
	smithing: { key: "smithing", name: "Smithing", icon: "/skills/Smithing.png" },
	magic: { key: "magic", name: "Magic", icon: "/skills/Magic.png" },
	prayer: { key: "prayer", name: "Prayer", icon: "/skills/Prayer.png" },
	agility: { key: "agility", name: "Agility", icon: "/skills/Agility.png" },
	thieving: { key: "thieving", name: "Thieving", icon: "/skills/Thieving.png" },
	hunter: { key: "hunter", name: "Hunter", icon: "/skills/Hunter.png" },
	farming: { key: "farming", name: "Farming", icon: "/skills/Farming.png" },
	herblore: { key: "herblore", name: "Herblore", icon: "/skills/Herblore.png" },
	construction: { key: "construction", name: "Construction", icon: "/skills/Construction.png" },
	slayer: { key: "slayer", name: "Slayer", icon: "/skills/Slayer.png" },
	crafting: { key: "crafting", name: "Crafting", icon: "/skills/Crafting.png" },
	combat: { key: "combat", name: "Combat", icon: "/skills/Combat.png" },
	questing: { key: "questing", name: "Questing", icon: "/skills/Quest_point.png" },
	misc: { key: "misc", name: "Misc", icon: "/skills/Stats.png" }
}

const PATTERNS: { pattern: RegExp; key: string }[] = [
	{ pattern: /runecraft|zmi|ourania|abyss|gotr|guardians of the rift/, key: "runecrafting" },
	{ pattern: /woodcut|chop|forestry/, key: "woodcutting" },
	{ pattern: /min(e|er|ing)|motherlode|shooting star|amethyst|quarry/, key: "mining" },
	{ pattern: /fish|tempoross|karambwan/, key: "fishing" },
	{ pattern: /cook/, key: "cooking" },
	{ pattern: /wintertodt|firemak|burn|log.?burner/, key: "firemaking" },
	{ pattern: /fletch/, key: "fletching" },
	{ pattern: /smith|smelt|blast furnace|cannonball|anvil/, key: "smithing" },
	{ pattern: /superglass|tab maker|spell|magic|alch|enchant|splash|lunar|plank make|teleport/, key: "magic" },
	{ pattern: /pray|bones|ecto|gilded altar|offerer/, key: "prayer" },
	{ pattern: /agility|rooftop|sepulchre/, key: "agility" },
	{ pattern: /thiev|pickpocket|stall|glassblow|trouble brewing/, key: "thieving" },
	{ pattern: /hunt|birdhouse|chinchompa|salamander|kebbit/, key: "hunter" },
	{ pattern: /farm|tithe|herb run|hardwood/, key: "farming" },
	{ pattern: /herblore|potion|clean herb/, key: "herblore" },
	{ pattern: /construction|mahogany home|builder/, key: "construction" },
	{ pattern: /slayer|kraken|nightmare zone|\bnmz\b|crab/, key: "slayer" },
	{ pattern: /quest/, key: "questing" },
	{ pattern: /craft|jewelry|jewellery|tanner|gem|hide/, key: "crafting" },
	{ pattern: /combat|fight|dream|bandit|splasher|barrows|knights/, key: "combat" }
]

export function categorize(title: string, url = ""): Category {
	const haystack = (title + " " + url).toLowerCase()
	for (const { pattern, key } of PATTERNS) {
		if (pattern.test(haystack)) return CATEGORIES[key]
	}
	return CATEGORIES.misc
}
