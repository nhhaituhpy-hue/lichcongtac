-- Migration: Tạo bảng lưu trữ thông tin đăng nhập sinh trắc học (WebAuthn / Passkeys)
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id TEXT PRIMARY KEY,
    public_key TEXT NOT NULL,
    role TEXT NOT NULL,
    device_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webauthn_role ON webauthn_credentials(role);
