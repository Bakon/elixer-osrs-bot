#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use self::windows::bring_window_to_top;
#[cfg(target_os = "windows")]
pub use self::windows::list_processes;
#[cfg(target_os = "windows")]
pub use self::windows::WindowMatch;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
pub use self::linux::list_processes;
