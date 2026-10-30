-- The single login account, created from the UI's sign-up page. Only one row can ever exist
-- (id = 1), so once it's created sign-up is closed.
CREATE TABLE account (
  id                   smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  username             text NOT NULL CHECK (length(btrim(username)) > 0),
  password_hash        text NOT NULL,                  -- scrypt:N:r:p:salt:hash (utils/auth.js)
  session_secret       text NOT NULL,                  -- HMAC key for session cookies
  created_at           timestamptz NOT NULL DEFAULT now(),
  password_changed_at  timestamptz NOT NULL DEFAULT now()
);
