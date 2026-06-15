-- Anonymous, end-to-end-encrypted sync mailbox.
-- The server stores only an opaque account id (a hash derived from the user's
-- secret) and ciphertext it cannot read. No PII, no accounts.

CREATE TABLE IF NOT EXISTS sync_blobs (
  account_id  TEXT PRIMARY KEY,        -- sha256 of the client's auth token (hex)
  payload     TEXT NOT NULL,           -- base64( iv || AES-GCM ciphertext )
  version     INTEGER NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
