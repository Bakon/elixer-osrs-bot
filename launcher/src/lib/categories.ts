// osrs-bot: infer the RuneScape skill/activity a script trains from its
// title/filename. Pure keyword heuristics — local scripts carry no category
// metadata. First match wins, so more specific patterns go first.
import type { Icon } from "@lucide/svelte"
import Axe from "@lucide/svelte/icons/axe"
import Pickaxe from "@lucide/svelte/icons/pickaxe"
import Fish from "@lucide/svelte/icons/fish"
import CookingPot from "@lucide/svelte/icons/cooking-pot"
import Flame from "@lucide/svelte/icons/flame"
import Feather from "@lucide/svelte/icons/feather"
import Gem from "@lucide/svelte/icons/gem"
import Anvil from "@lucide/svelte/icons/anvil"
import WandSparkles from "@lucide/svelte/icons/wand-sparkles"
import Swords from "@lucide/svelte/icons/swords"
import Bone from "@lucide/svelte/icons/bone"
import Footprints from "@lucide/svelte/icons/footprints"
import VenetianMask from "@lucide/svelte/icons/venetian-mask"
import Bird from "@lucide/svelte/icons/bird"
import Sprout from "@lucide/svelte/icons/sprout"
import FlaskConical from "@lucide/svelte/icons/flask-conical"
import Orbit from "@lucide/svelte/icons/orbit"
import House from "@lucide/svelte/icons/house"
import Skull from "@lucide/svelte/icons/skull"
import ScrollText from "@lucide/svelte/icons/scroll-text"
import Puzzle from "@lucide/svelte/icons/puzzle"

export interface Category {
	name: string
	icon: typeof Icon
}

const CATEGORIES: { pattern: RegExp; category: Category }[] = [
	{ pattern: /runecraft|zmi|ourania|abyss|gotr|guardians of the rift/, category: { name: "Runecrafting", icon: Orbit } },
	{ pattern: /woodcut|chop|forestry/, category: { name: "Woodcutting", icon: Axe } },
	{ pattern: /min(e|er|ing)|motherlode|shooting star|amethyst/, category: { name: "Mining", icon: Pickaxe } },
	{ pattern: /fish|tempoross|karambwan/, category: { name: "Fishing", icon: Fish } },
	{ pattern: /cook/, category: { name: "Cooking", icon: CookingPot } },
	{ pattern: /wintertodt|firemak|burn/, category: { name: "Firemaking", icon: Flame } },
	{ pattern: /fletch/, category: { name: "Fletching", icon: Feather } },
	{ pattern: /smith|smelt|blast furnace|cannonball/, category: { name: "Smithing", icon: Anvil } },
	{ pattern: /superglass|tab maker|spell|magic|alch|enchant|splash|lunar|plank make/, category: { name: "Magic", icon: WandSparkles } },
	{ pattern: /pray|bones|ecto|gilded altar|wyrm bane/, category: { name: "Prayer", icon: Bone } },
	{ pattern: /agility|rooftop|sepulchre/, category: { name: "Agility", icon: Footprints } },
	{ pattern: /thiev|pickpocket|stall|glassblow/, category: { name: "Thieving", icon: VenetianMask } },
	{ pattern: /hunt|birdhouse|chinchompa|salamander/, category: { name: "Hunter", icon: Bird } },
	{ pattern: /farm|tithe|herb run|hardwood/, category: { name: "Farming", icon: Sprout } },
	{ pattern: /herblore|potion|clean herb/, category: { name: "Herblore", icon: FlaskConical } },
	{ pattern: /construction|mahogany home/, category: { name: "Construction", icon: House } },
	{ pattern: /slayer/, category: { name: "Slayer", icon: Skull } },
	{ pattern: /quest/, category: { name: "Questing", icon: ScrollText } },
	{ pattern: /craft/, category: { name: "Crafting", icon: Gem } },
	{ pattern: /combat|fight|crab|nmz|dream|bandit|splasher|barrows/, category: { name: "Combat", icon: Swords } }
]

const MISC: Category = { name: "Misc", icon: Puzzle }

export function categorize(title: string, url = ""): Category {
	const haystack = (title + " " + url).toLowerCase()
	for (const { pattern, category } of CATEGORIES) {
		if (pattern.test(haystack)) return category
	}
	return MISC
}
