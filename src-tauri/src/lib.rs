use tauri::webview::{PermissionKind, PermissionResponse};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // The app reads audio from an input device (e.g. VB-CABLE Output), so grant
        // microphone access without a WebView prompt. Everything else keeps the default.
        .on_permission_request(|_, kind| match kind {
            PermissionKind::Microphone | PermissionKind::Autoplay => PermissionResponse::Allow,
            _ => PermissionResponse::Default,
        })
        .run(tauri::generate_context!())
        .expect("error while running FX Anything");
}
