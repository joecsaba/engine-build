-- =============================================================================
-- User Preferences
-- =============================================================================
-- Single-row-per-user table keyed by Cognito sub. Holds:
--   * Favorites (calculator slugs the user has pinned)
--   * Recents (auto-tracked list of recently opened calculators)
--   * Default units (imperial / metric) for converters
--   * Default platform slug (e.g. sbc350) for build-aware calculators
--   * Sidebar tools (calculator slugs pinned in the always-visible sidebar)
--   * Display name (optional user-set name shown in nav)
--   * settings: catch-all JSONB for future per-user flags
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id          TEXT PRIMARY KEY,                          -- Cognito "sub"
    display_name     TEXT,
    default_units    TEXT NOT NULL DEFAULT 'imperial',          -- 'imperial' | 'metric'
    default_platform TEXT,                                      -- engine slug, e.g. 'sbc350'
    favorites        JSONB NOT NULL DEFAULT '[]'::jsonb,        -- string[]
    recents          JSONB NOT NULL DEFAULT '[]'::jsonb,        -- [{slug, ts}]
    sidebar_tools    JSONB NOT NULL DEFAULT '[]'::jsonb,        -- string[]
    settings         JSONB NOT NULL DEFAULT '{}'::jsonb,        -- catch-all
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional partial index for users who have set a default platform — speeds up
-- any future "popular platform" analytics queries.
CREATE INDEX IF NOT EXISTS idx_user_preferences_platform
    ON user_preferences (default_platform)
    WHERE default_platform IS NOT NULL;
