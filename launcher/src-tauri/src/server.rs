use std::{
    collections::HashMap,
    io::{Read, Write},
    net::TcpStream,
};

use tauri::Emitter;

fn send_redirect(location: &str) -> String {
    format!(
        "HTTP/1.1 302 Found\r\n\
         Location: {location}\r\n\
         Connection: close\r\n\
         Content-Length: 0\r\n\r\n"
    )
}

pub fn handle_client(mut stream: TcpStream, app: tauri::AppHandle) -> bool {
    let mut buffer = [0; 1024];
    if stream.read(&mut buffer).is_err() {
        return false;
    }

    let request = String::from_utf8_lossy(&buffer);
    let Some(request_line) = request.lines().next() else {
        return false;
    };

    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        return false;
    }

    let path = parts[1];
    let Some(q_idx) = path.find('?') else {
        return false;
    };

    let query = &path[q_idx + 1..];
    let params: HashMap<&str, &str> = query
        .split('&')
        .filter_map(|kv| {
            let mut split = kv.splitn(2, '=');
            Some((split.next()?, split.next().unwrap_or("")))
        })
        .collect();

    let code = params.get("code").map(|&s| s.to_string());
    let error = params.get("error").map(|&s| s.to_string());

    // Determine redirect target
    let redirect_url = if code.is_some() {
        "https://waspscripts.dev/auth/launcher/successful"
    } else {
        "https://waspscripts.dev/auth/launcher/failed"
    };

    let response = send_redirect(redirect_url);

    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();

    let payload = serde_json::json!({
        "code": code,
        "error": error
    });

    let _ = app
        .emit("oauth-callback", payload)
        .expect("Failed to ping the front-end!");

    true
}
