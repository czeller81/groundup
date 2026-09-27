BEGIN;

CREATE TABLE waiver_acceptances (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id varchar NOT NULL REFERENCES users(id),
  form_id varchar NOT NULL REFERENCES forms(id),
  form_response_id varchar,
  terms_version_hash text NOT NULL,
  terms_snapshot jsonb NOT NULL,
  evidence jsonb NOT NULL,
  signer_name text NOT NULL,
  accepted_at timestamp NOT NULL,
  accepted_via text NOT NULL DEFAULT 'member_portal',
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT waiver_acceptances_human_acceptance_only_check
    CHECK (accepted_via = 'member_portal'),
  CONSTRAINT waiver_acceptances_terms_snapshot_object_check
    CHECK (jsonb_typeof(terms_snapshot) = 'object'),
  CONSTRAINT waiver_acceptances_evidence_object_check
    CHECK (jsonb_typeof(evidence) = 'object')
);

CREATE UNIQUE INDEX waiver_acceptances_user_form_version_unique
  ON waiver_acceptances(user_id, form_id, terms_version_hash);
CREATE INDEX waiver_acceptances_user_form_idx
  ON waiver_acceptances(user_id, form_id);
CREATE INDEX waiver_acceptances_accepted_at_idx
  ON waiver_acceptances(accepted_at);

CREATE TABLE member_ai_delegations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id varchar NOT NULL REFERENCES users(id),
  label text,
  token_hash text NOT NULL,
  scopes jsonb NOT NULL,
  expires_at timestamp NOT NULL,
  revoked_at timestamp,
  last_used_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT member_ai_delegations_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT member_ai_delegations_token_hash_format_check
    CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT member_ai_delegations_scopes_valid_check
    CHECK (
      jsonb_typeof(scopes) = 'array'
      AND jsonb_array_length(scopes) BETWEEN 1 AND 7
      AND scopes <@ '["self:profile:read","self:schedule:read","self:reservations:read","self:dependents:read","self:booking:preview","self:waiver:initiate","self:reservation:create"]'::jsonb
    ),
  CONSTRAINT member_ai_delegations_expiry_valid_check
    CHECK (
      expires_at > created_at
      AND expires_at <= created_at + interval '7 days 1 minute'
    )
);

CREATE INDEX member_ai_delegations_user_idx
  ON member_ai_delegations(user_id);
CREATE INDEX member_ai_delegations_expiry_idx
  ON member_ai_delegations(expires_at);
CREATE INDEX member_ai_delegations_revoked_idx
  ON member_ai_delegations(revoked_at);

COMMIT;