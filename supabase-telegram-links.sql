-- Tabla para vincular usuarios web con Telegram
  CREATE TABLE IF NOT EXISTS telegram_links (
    user_id    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id    TEXT        NOT NULL UNIQUE,
    username   TEXT,
    first_name TEXT,
    linked_at  TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE telegram_links ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "users can read own telegram link" ON telegram_links
    FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "users can delete own telegram link" ON telegram_links
    FOR DELETE USING (auth.uid() = user_id);

  -- Tabla para códigos de vinculación (un solo uso, expiran en 15 min)
  CREATE TABLE IF NOT EXISTS telegram_link_codes (
    code       TEXT        PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
    used       BOOLEAN     DEFAULT FALSE
  );
  ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;
  -- Solo el service role puede operar esta tabla (via API server)
  