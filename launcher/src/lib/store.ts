import { writable } from "svelte/store"
export const devModeStore = writable(false)
export const devPathStore = writable("")
export const devUpdatesStore = writable(true)
