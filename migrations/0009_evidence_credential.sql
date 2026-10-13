-- Preserve which noninteractive credential asserted evidence, without storing a secret/hash.
-- Deliberately no FK: provenance must survive credential deletion.
ALTER TABLE release_evidence ADD COLUMN credential_id TEXT;
