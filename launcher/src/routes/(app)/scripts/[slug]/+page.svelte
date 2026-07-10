<script lang="ts">
	import { mdRenderer } from "$lib/markdown"
	import { categorize, CATEGORIES } from "$lib/categories"
	import { library } from "$lib/library.svelte"
	import { stemOf } from "$lib/scripts"
	import descriptions from "$lib/script-descriptions.json"
	import Star from "@lucide/svelte/icons/star"
	import ThumbsUp from "@lucide/svelte/icons/thumbs-up"
	import ThumbsDown from "@lucide/svelte/icons/thumbs-down"
	import Pencil from "@lucide/svelte/icons/pencil"
	import EyeOff from "@lucide/svelte/icons/eye-off"

	let { data } = $props()
	const script = $derived(data.script)!

	const override = $derived(library.override(script.id))
	const title = $derived(override.title ?? script.title)
	const category = $derived((override.category && CATEGORIES[override.category]) || categorize(script.title, script.url))
	// Description precedence: user's own edit > generated-from-code default.
	const generated = $derived((descriptions as Record<string, string>)[stemOf(script)] ?? "")
	const description = $derived(override.description ?? generated)
	const isCustom = $derived(override.description != null)
	const image = $derived(override.image ?? "")
	const verdict = $derived(library.verdicts[script.id])
	const favorite = $derived(library.isFavorite(script.id))

	// --- edit dialog -------------------------------------------------------
	let dialog: HTMLDialogElement
	let editTitle = $state("")
	let editCategory = $state("")
	let editDescription = $state("")
	let editImage = $state("")

	function openEdit() {
		editTitle = override.title ?? script.title
		editCategory = override.category ?? category.key
		// Pre-fill with the generated description so the user edits from it.
		editDescription = override.description ?? generated
		editImage = override.image ?? ""
		dialog.showModal()
	}

	function pickImage(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0]
		if (!file) return
		const reader = new FileReader()
		reader.onload = () => (editImage = reader.result as string)
		reader.readAsDataURL(file)
	}

	async function saveEdit() {
		await library.setOverride(script.id, {
			// store only what differs from the defaults
			title: editTitle.trim() === script.title ? "" : editTitle.trim(),
			category: editCategory === categorize(script.title, script.url).key ? "" : editCategory,
			// don't persist an override that just equals the generated default
			description: editDescription.trim() === generated.trim() ? "" : editDescription.trim(),
			image: editImage
		})
		dialog.close()
	}
</script>

<div class="flex w-full flex-col gap-4 xl:flex-row">
	<div
		class="mx-auto flex h-44 w-full max-w-140 shrink-0 items-center justify-center overflow-hidden rounded-md preset-outlined-surface-500 xl:mx-0 xl:w-80"
	>
		{#if image}
			<img src={image} alt={title} class="h-full w-full object-cover" />
		{:else}
			<div class="flex flex-col items-center gap-3 opacity-50">
				<img src={category.icon} alt={category.name} class="h-12 w-12" />
				<span class="text-sm">{category.name}</span>
			</div>
		{/if}
	</div>

	<div class="flex w-full flex-col justify-center gap-3">
		<div class="flex items-start justify-between gap-2">
			<div>
				<h1 class="h3 font-bold">{title}</h1>
				<p class="opacity-70">by {script.protected.username}</p>
			</div>
			<button class="btn h-9 gap-2 preset-outlined-surface-500 hover:border-primary-500" onclick={openEdit}>
				<Pencil size={16} /> Edit
			</button>
		</div>

		<div class="flex flex-wrap items-center gap-2 text-sm">
			<span class="badge flex items-center gap-1 preset-tonal">
				<img src={category.icon} alt="" class="h-4 w-4" />
				{category.name}
			</span>
			<span class="badge preset-tonal">Revision {script.protected.revision}</span>
			{#if verdict}
				<span class="badge {verdict === 'works' ? 'preset-filled-success-500' : 'preset-filled-error-500'}">
					{verdict === "works" ? "Works" : "Broken"}
				</span>
			{/if}
		</div>

		<div class="flex flex-wrap gap-2">
			<button
				class="btn h-9 gap-2 {favorite
					? 'preset-filled-warning-500'
					: 'preset-outlined-surface-500 hover:border-warning-500'}"
				onclick={async () => await library.toggleFavorite(script.id)}
			>
				<Star size={16} fill={favorite ? "currentColor" : "none"} />
				{favorite ? "Favorited" : "Favorite"}
			</button>
			<button
				class="btn h-9 gap-2 {verdict === 'works'
					? 'preset-filled-success-500'
					: 'preset-outlined-surface-500 hover:border-success-500'}"
				onclick={async () => await library.setVerdict(script.id, "works")}
			>
				<ThumbsUp size={16} /> Works
			</button>
			<button
				class="btn h-9 gap-2 {verdict === 'broken'
					? 'preset-filled-error-500'
					: 'preset-outlined-surface-500 hover:border-error-500'}"
				onclick={async () => await library.setVerdict(script.id, "broken")}
			>
				<ThumbsDown size={16} /> Broken
			</button>
		</div>
	</div>
</div>

<div class="flex h-full w-full flex-col gap-2 overflow-y-auto rounded-md preset-outlined-surface-500 p-8">
	{#if description}
		{#if !isCustom}
			<p class="text-xs opacity-50">
				Auto-generated from the script's code — edit to refine or correct it.
			</p>
		{/if}
		<article class="prose max-w-none dark:prose-invert">
			{@html mdRenderer.render(description)}
		</article>
	{:else}
		<div class="m-auto flex max-w-md flex-col items-center gap-3 py-12 text-center opacity-60">
			<p>No description yet.</p>
			<p class="text-sm">
				Add your own notes — what it does, setup, requirements — with the <b>Edit</b> button.
				Markdown works.
			</p>
			<button class="btn preset-filled-primary-500" onclick={openEdit}>Add a description</button>
		</div>
	{/if}
</div>

<dialog
	bind:this={dialog}
	class="top-1/2 left-1/2 z-10 w-[42rem] max-w-[90vw] -translate-1/2 space-y-4 rounded-container bg-surface-100-900 p-6 text-inherit backdrop-blur-lg backdrop:bg-surface-50-950/80"
>
	<h2 class="h4 font-bold">Edit script</h2>

	<label class="label">
		<span class="text-sm">Name</span>
		<input class="input" bind:value={editTitle} placeholder={script.title} />
	</label>

	<label class="label">
		<span class="text-sm">Skill / category</span>
		<select class="select" bind:value={editCategory}>
			{#each Object.values(CATEGORIES) as c (c.key)}
				<option value={c.key}>{c.name}</option>
			{/each}
		</select>
	</label>

	<label class="label">
		<span class="text-sm">Description (markdown — add setup, requirements, notes)</span>
		<textarea class="textarea min-h-40" bind:value={editDescription}></textarea>
	</label>

	<div class="label">
		<span class="text-sm">Image</span>
		<div class="flex items-center gap-3">
			{#if editImage}
				<img src={editImage} alt="" class="h-16 w-24 rounded object-cover" />
			{/if}
			<input type="file" accept="image/*" onchange={pickImage} class="text-sm" />
			{#if editImage}
				<button class="btn preset-tonal" onclick={() => (editImage = "")}>Remove</button>
			{/if}
		</div>
	</div>

	<footer class="flex items-center justify-between gap-2 pt-2">
		<button
			class="btn gap-2 {library.isHidden(script.id)
				? 'preset-filled-surface-500'
				: 'preset-tonal'}"
			title="Hide this script from the list (reversible)"
			onclick={async () => {
				await library.toggleHidden(script.id)
				dialog.close()
			}}
		>
			<EyeOff size={16} />
			{library.isHidden(script.id) ? "Unhide" : "Hide"}
		</button>
		<div class="flex gap-2">
			<button class="btn preset-tonal" onclick={() => dialog.close()}>Cancel</button>
			<button class="btn preset-filled-primary-500" onclick={saveEdit}>Save</button>
		</div>
	</footer>
</dialog>
