-- Community-voted source submissions.
-- Existing (seeded) sources default to 'approved'; user submissions start 'pending'
-- and auto-approve once they reach the vote threshold.

ALTER TABLE sources ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE sources ADD COLUMN IF NOT EXISTS submitted_by_device UUID;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS votes INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sources_status ON sources (status);

-- One vote per anonymous device per source.
CREATE TABLE IF NOT EXISTS source_votes (
  source_id  INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  device_id  UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source_id, device_id)
);
