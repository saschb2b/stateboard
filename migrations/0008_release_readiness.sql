-- Release readiness is additive: existing boards, screens and region states stay valid.
CREATE TABLE capabilities (
 id TEXT PRIMARY KEY, board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
 name TEXT NOT NULL, outcome TEXT NOT NULL, definition_revision INTEGER NOT NULL DEFAULT 1 CHECK (definition_revision > 0),
 owner_label TEXT NOT NULL, owner_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
 archived_at BIGINT, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL,
 UNIQUE(id, board_id)
);
CREATE INDEX idx_capabilities_board ON capabilities(board_id);
CREATE TABLE components (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 name TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('service','api','event','worker','datastore','external')),
 owner_label TEXT NOT NULL, owner_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
 description TEXT NOT NULL DEFAULT '', reference_url TEXT, archived_at BIGINT,
 created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, UNIQUE(id, workspace_id)
);
CREATE INDEX idx_components_workspace ON components(workspace_id);
CREATE TABLE capability_components (
 capability_id TEXT NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
 component_id TEXT NOT NULL REFERENCES components(id) ON DELETE RESTRICT,
 relation TEXT NOT NULL, required BOOLEAN NOT NULL DEFAULT TRUE, description TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(capability_id, component_id)
);
CREATE TABLE component_dependencies (
 id TEXT PRIMARY KEY, consumer_id TEXT NOT NULL REFERENCES components(id) ON DELETE RESTRICT,
 provider_id TEXT NOT NULL REFERENCES components(id) ON DELETE RESTRICT,
 relation TEXT NOT NULL, required BOOLEAN NOT NULL DEFAULT TRUE, description TEXT NOT NULL DEFAULT '',
 UNIQUE(consumer_id, provider_id, relation)
);
CREATE TABLE region_capabilities (
 region_id TEXT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
 capability_id TEXT NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
 PRIMARY KEY(region_id, capability_id)
);
CREATE TABLE release_assessments (
 id TEXT PRIMARY KEY, board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE RESTRICT,
 candidate_label TEXT NOT NULL, candidate_ref TEXT NOT NULL,
 validation_environment TEXT NOT NULL, target_environment TEXT NOT NULL,
 audience TEXT NOT NULL, configuration_ref TEXT NOT NULL, owner_label TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0), created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL,
 UNIQUE(id, board_id)
);
CREATE INDEX idx_releases_board ON release_assessments(board_id, created_at DESC);
CREATE TABLE release_capabilities (
 assessment_id TEXT NOT NULL REFERENCES release_assessments(id) ON DELETE RESTRICT,
 capability_id TEXT NOT NULL REFERENCES capabilities(id) ON DELETE RESTRICT,
 name TEXT NOT NULL, outcome TEXT NOT NULL, definition_revision INTEGER NOT NULL CHECK(definition_revision > 0),
 owner_label TEXT NOT NULL, included BOOLEAN NOT NULL DEFAULT TRUE, scope_reason TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(assessment_id, capability_id)
);
CREATE TABLE release_checks (
 id TEXT PRIMARY KEY, assessment_id TEXT NOT NULL REFERENCES release_assessments(id) ON DELETE RESTRICT,
 subject_type TEXT NOT NULL CHECK(subject_type IN ('capability','component','release')),
 subject_id TEXT, active_revision INTEGER NOT NULL DEFAULT 1 CHECK(active_revision > 0), archived_at BIGINT,
 CHECK ((subject_type = 'release' AND subject_id IS NULL) OR (subject_type <> 'release' AND subject_id IS NOT NULL)),
 UNIQUE(id, assessment_id)
);
CREATE TABLE release_check_revisions (
 check_id TEXT NOT NULL REFERENCES release_checks(id) ON DELETE RESTRICT,
 revision INTEGER NOT NULL CHECK(revision > 0), claim TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN ('functional','integration','ux','data','security','operational')),
 required BOOLEAN NOT NULL, owner_label TEXT NOT NULL, method TEXT NOT NULL,
 environment TEXT NOT NULL, max_age_ms BIGINT NOT NULL CHECK(max_age_ms > 0), created_at BIGINT NOT NULL,
 PRIMARY KEY(check_id, revision)
);
CREATE TABLE release_evidence (
 id TEXT PRIMARY KEY, sequence BIGSERIAL UNIQUE NOT NULL,
 assessment_id TEXT NOT NULL REFERENCES release_assessments(id) ON DELETE RESTRICT,
 check_id TEXT NOT NULL, check_revision INTEGER NOT NULL,
 candidate_ref TEXT NOT NULL, environment TEXT NOT NULL, audience TEXT NOT NULL, configuration_ref TEXT NOT NULL,
 result TEXT NOT NULL CHECK(result IN ('pass','fail','inconclusive')), summary TEXT NOT NULL,
 source TEXT NOT NULL, run_ref TEXT NOT NULL, event_id TEXT NOT NULL,
 observed_at BIGINT NOT NULL, received_at BIGINT NOT NULL,
 actor_id TEXT REFERENCES "user"(id) ON DELETE SET NULL, actor_name TEXT NOT NULL,
 credential_kind TEXT NOT NULL CHECK(credential_kind IN ('session','api_key')), reference_url TEXT,
 FOREIGN KEY(check_id, assessment_id) REFERENCES release_checks(id, assessment_id) ON DELETE RESTRICT,
 FOREIGN KEY(check_id, check_revision) REFERENCES release_check_revisions(check_id, revision) ON DELETE RESTRICT,
 UNIQUE(assessment_id, source, event_id)
);
CREATE INDEX idx_evidence_selection ON release_evidence(assessment_id, check_id, check_revision, observed_at DESC, sequence DESC);
CREATE TABLE release_decisions (
 id TEXT PRIMARY KEY, assessment_id TEXT NOT NULL REFERENCES release_assessments(id) ON DELETE RESTRICT,
 revision INTEGER NOT NULL, decision TEXT NOT NULL CHECK(decision IN ('approved','held')),
 rationale TEXT NOT NULL, actor_id TEXT REFERENCES "user"(id) ON DELETE SET NULL, actor_name TEXT NOT NULL,
 created_at BIGINT NOT NULL, expires_at BIGINT, snapshot JSONB NOT NULL
);
CREATE INDEX idx_decisions_release ON release_decisions(assessment_id, created_at DESC);
CREATE TABLE release_assets (
 id TEXT PRIMARY KEY, assessment_id TEXT NOT NULL REFERENCES release_assessments(id) ON DELETE RESTRICT,
 decision_id TEXT REFERENCES release_decisions(id) ON DELETE RESTRICT, filename TEXT NOT NULL UNIQUE,
 mime_type TEXT NOT NULL CHECK(mime_type IN ('image/png','image/jpeg','image/webp','image/gif')),
 width INTEGER NOT NULL CHECK(width > 0), height INTEGER NOT NULL CHECK(height > 0),
 size_bytes BIGINT NOT NULL CHECK(size_bytes > 0), digest TEXT NOT NULL, label TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE release_share_links (
 token TEXT PRIMARY KEY, decision_id TEXT NOT NULL REFERENCES release_decisions(id) ON DELETE RESTRICT,
 projection JSONB NOT NULL, created_at BIGINT NOT NULL, revoked_at BIGINT
);
CREATE INDEX idx_release_shares_decision ON release_share_links(decision_id);

-- Denormalized workspace/board constraints are also enforced for SQL callers.
CREATE FUNCTION enforce_release_relationship_scope() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE left_workspace TEXT; right_workspace TEXT; left_board TEXT; right_board TEXT;
BEGIN
 IF TG_TABLE_NAME = 'capability_components' THEN
  SELECT b.workspace_id INTO left_workspace FROM capabilities c JOIN boards b ON b.id=c.board_id WHERE c.id=NEW.capability_id;
  SELECT workspace_id INTO right_workspace FROM components WHERE id=NEW.component_id;
 ELSIF TG_TABLE_NAME = 'component_dependencies' THEN
  SELECT workspace_id INTO left_workspace FROM components WHERE id=NEW.consumer_id;
  SELECT workspace_id INTO right_workspace FROM components WHERE id=NEW.provider_id;
 ELSIF TG_TABLE_NAME = 'region_capabilities' THEN
  SELECT s.board_id INTO left_board FROM regions r JOIN screens s ON s.id=r.screen_id WHERE r.id=NEW.region_id;
  SELECT board_id INTO right_board FROM capabilities WHERE id=NEW.capability_id;
 ELSIF TG_TABLE_NAME = 'release_capabilities' THEN
  SELECT board_id INTO left_board FROM release_assessments WHERE id=NEW.assessment_id;
  SELECT board_id INTO right_board FROM capabilities WHERE id=NEW.capability_id;
 END IF;
 IF left_workspace IS DISTINCT FROM right_workspace OR left_board IS DISTINCT FROM right_board THEN
  RAISE EXCEPTION 'relationship crosses a workspace or board boundary' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER capability_component_scope BEFORE INSERT OR UPDATE ON capability_components FOR EACH ROW EXECUTE FUNCTION enforce_release_relationship_scope();
CREATE TRIGGER component_dependency_scope BEFORE INSERT OR UPDATE ON component_dependencies FOR EACH ROW EXECUTE FUNCTION enforce_release_relationship_scope();
CREATE TRIGGER region_capability_scope BEFORE INSERT OR UPDATE ON region_capabilities FOR EACH ROW EXECUTE FUNCTION enforce_release_relationship_scope();
CREATE TRIGGER release_capability_scope BEFORE INSERT OR UPDATE ON release_capabilities FOR EACH ROW EXECUTE FUNCTION enforce_release_relationship_scope();

-- Event/definition rows can be appended, never rewritten (account deletion may clear attribution).
CREATE FUNCTION protect_release_history() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND TG_TABLE_NAME IN ('release_evidence','release_decisions') AND
    NEW.actor_id IS NULL AND OLD.actor_id IS NOT NULL AND
    (to_jsonb(NEW)-'actor_id') = (to_jsonb(OLD)-'actor_id') THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'release history is immutable' USING ERRCODE='23514';
END $$;
CREATE TRIGGER immutable_check_revisions BEFORE UPDATE OR DELETE ON release_check_revisions FOR EACH ROW EXECUTE FUNCTION protect_release_history();
CREATE TRIGGER immutable_evidence BEFORE UPDATE OR DELETE ON release_evidence FOR EACH ROW EXECUTE FUNCTION protect_release_history();
CREATE TRIGGER immutable_decisions BEFORE UPDATE OR DELETE ON release_decisions FOR EACH ROW EXECUTE FUNCTION protect_release_history();
