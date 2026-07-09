pub fn list_processes() {
    if let Ok(entries) = fs::read_dir("/proc") {
        for entry in entries.flatten() {
            let s_name = entry.file_name().to_string_lossy().into_owned();
            if s_name.chars().all(|c| c.is_numeric()) {
                if let Ok(comm) = fs::read_to_string(format!("/proc/{}/comm", s_name)) {
                    println!("PID: {} | Name: {}", s_name, comm.trim());
                }
            }
        }
    }
}
