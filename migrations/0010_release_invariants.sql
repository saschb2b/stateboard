-- Context and check identity cannot be reassigned after evidence exists.
CREATE FUNCTION enforce_release_identity() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='release_assessments' THEN
  IF (NEW.board_id,NEW.candidate_ref,NEW.validation_environment,NEW.target_environment,NEW.audience,NEW.configuration_ref)
   IS DISTINCT FROM (OLD.board_id,OLD.candidate_ref,OLD.validation_environment,OLD.target_environment,OLD.audience,OLD.configuration_ref)
  THEN RAISE EXCEPTION 'assessment context is immutable; create another assessment' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='release_checks' THEN
  IF (NEW.assessment_id,NEW.subject_type,NEW.subject_id) IS DISTINCT FROM (OLD.assessment_id,OLD.subject_type,OLD.subject_id)
  THEN RAISE EXCEPTION 'check subject is immutable; create another check' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_assessment_context BEFORE UPDATE ON release_assessments FOR EACH ROW EXECUTE FUNCTION enforce_release_identity();
CREATE TRIGGER immutable_check_subject BEFORE UPDATE ON release_checks FOR EACH ROW EXECUTE FUNCTION enforce_release_identity();
ALTER TABLE release_checks ADD CONSTRAINT active_check_revision_exists
 FOREIGN KEY(id,active_revision) REFERENCES release_check_revisions(check_id,revision)
 DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION enforce_release_check_subject() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE assessment_board TEXT; assessment_workspace TEXT; subject_workspace TEXT;
BEGIN
 SELECT r.board_id,b.workspace_id INTO assessment_board,assessment_workspace
 FROM release_assessments r JOIN boards b ON b.id=r.board_id WHERE r.id=NEW.assessment_id;
 IF NEW.subject_type='capability' THEN
  IF NOT EXISTS(SELECT 1 FROM release_capabilities rc JOIN capabilities c ON c.id=rc.capability_id
   WHERE rc.assessment_id=NEW.assessment_id AND rc.capability_id=NEW.subject_id AND rc.included AND c.board_id=assessment_board)
  THEN RAISE EXCEPTION 'check capability is not included in this assessment' USING ERRCODE='23514'; END IF;
 ELSIF NEW.subject_type='component' THEN
  SELECT workspace_id INTO subject_workspace FROM components WHERE id=NEW.subject_id;
  IF subject_workspace IS NULL OR subject_workspace IS DISTINCT FROM assessment_workspace
  THEN RAISE EXCEPTION 'check component belongs to another workspace' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER release_check_subject_scope BEFORE INSERT ON release_checks FOR EACH ROW EXECUTE FUNCTION enforce_release_check_subject();

CREATE FUNCTION enforce_release_evidence_context() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE assessment release_assessments%ROWTYPE; expected_environment TEXT; active_revision INTEGER;
BEGIN
 SELECT * INTO assessment FROM release_assessments WHERE id=NEW.assessment_id;
 SELECT c.active_revision,d.environment INTO active_revision,expected_environment FROM release_checks c
 JOIN release_check_revisions d ON d.check_id=c.id AND d.revision=c.active_revision
 WHERE c.id=NEW.check_id AND c.assessment_id=NEW.assessment_id AND c.archived_at IS NULL;
 IF active_revision IS NULL OR NEW.check_revision IS DISTINCT FROM active_revision OR
    NEW.candidate_ref IS DISTINCT FROM assessment.candidate_ref OR
    NEW.environment IS DISTINCT FROM expected_environment OR NEW.audience IS DISTINCT FROM assessment.audience OR
    NEW.configuration_ref IS DISTINCT FROM assessment.configuration_ref OR NEW.observed_at>NEW.received_at
 THEN RAISE EXCEPTION 'evidence must match the active assessment and check context' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER release_evidence_context BEFORE INSERT ON release_evidence FOR EACH ROW EXECUTE FUNCTION enforce_release_evidence_context();

CREATE FUNCTION enforce_release_asset_integrity() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.decision_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM release_decisions WHERE id=NEW.decision_id AND assessment_id=NEW.assessment_id)
 THEN RAISE EXCEPTION 'asset decision belongs to another assessment' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' AND ((to_jsonb(NEW)-'decision_id') IS DISTINCT FROM (to_jsonb(OLD)-'decision_id') OR
    OLD.decision_id IS NOT NULL AND NEW.decision_id IS DISTINCT FROM OLD.decision_id)
 THEN RAISE EXCEPTION 'retained asset metadata is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER release_asset_integrity BEFORE INSERT OR UPDATE ON release_assets FOR EACH ROW EXECUTE FUNCTION enforce_release_asset_integrity();

CREATE FUNCTION enforce_release_share_integrity() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(NEW)-'revoked_at') IS DISTINCT FROM (to_jsonb(OLD)-'revoked_at') OR
    OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at
 THEN RAISE EXCEPTION 'public release projections are immutable; create another link' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_release_projection BEFORE UPDATE ON release_share_links FOR EACH ROW EXECUTE FUNCTION enforce_release_share_integrity();

-- Check definitions do not have actor_id; use JSON to keep one history guard generic.
CREATE OR REPLACE FUNCTION protect_release_history() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND TG_TABLE_NAME IN ('release_evidence','release_decisions') AND
    to_jsonb(NEW)->'actor_id'='null'::jsonb AND to_jsonb(OLD)->'actor_id'<>'null'::jsonb AND
    (to_jsonb(NEW)-'actor_id')=(to_jsonb(OLD)-'actor_id') THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'release history is immutable' USING ERRCODE='23514';
END $$;
