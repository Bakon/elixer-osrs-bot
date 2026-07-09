import { invoke } from "@tauri-apps/api/core"

export const load = async () => {
	return {
		pluginVersions: invoke("get_plugin_version", {}) as Promise<string>
	}
}
