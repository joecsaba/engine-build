-- =============================================================================
-- User Calculator Presets
-- =============================================================================
-- Per-user, per-calculator named saves. A user can save the input state of a
-- calculator (e.g. compression-ratio with "My 383 stroker" filled in) and
-- restore it later with a single click.
--
-- Many presets per (user, calc_slug). Names are unique within a single
-- (user, calc_slug) pair, so you can't have two "My 383 stroker" presets on
-- the same calc.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_calc_presets (
    id         SERIAL PRIMARY KEY,
    user_id    TEXT NOT NULL,                     -- Cognito "sub"
    calc_slug  TEXT NOT NULL,                     -- e.g. "compression-ratio"
    name       TEXT NOT NULL,                     -- user-given preset name
    state      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_calc_presets_user_calc_name_unique UNIQUE (user_id, calc_slug, name)
);

CREATE INDEX IF NOT EXISTS idx_user_calc_presets_user_calc
    ON user_calc_presets (user_id, calc_slug);
