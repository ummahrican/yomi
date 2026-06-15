-- Anonymous device registry: the denominator for "majority of users" votes.
-- One row per deviceId we've seen (via events / source votes). No PII.
CREATE TABLE IF NOT EXISTS devices (
  device_id  UUID PRIMARY KEY,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT now()
);
