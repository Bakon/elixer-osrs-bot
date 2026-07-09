fn main() {
    // Default build embeds the app manifest (incl. Common Controls v6, which
    // provides TaskDialogIndirect). We only stripped it for the GNU toolchain;
    // on MSVC it's needed and causes no conflict.
    tauri_build::build()
}
