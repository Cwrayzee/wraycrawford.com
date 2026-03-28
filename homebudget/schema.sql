-- ─────────────────────────────────────────────────────────────────────────────
-- Crawford Budget — Normalized Schema
-- Run this in phpMyAdmin on your Bluehost database.
-- If upgrading from the old single-JSON schema, the DROP line removes the old
-- budget_state table. Comment it out if you want to keep it as a backup first.
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS budget_state;

-- ── Households ────────────────────────────────────────────────────────────────
-- One row per household passphrase. All other tables hang off this.
CREATE TABLE IF NOT EXISTS households (
  id            INT          NOT NULL AUTO_INCREMENT,
  token_hash    CHAR(64)     NOT NULL,
  current_month VARCHAR(7)   NOT NULL DEFAULT '',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_token (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── People ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS people (
  app_id        VARCHAR(20)  NOT NULL,
  household_id  INT          NOT NULL,
  name          VARCHAR(100) NOT NULL DEFAULT '',
  PRIMARY KEY (app_id, household_id),
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Accounts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  app_id        VARCHAR(20)  NOT NULL,
  household_id  INT          NOT NULL,
  name          VARCHAR(100) NOT NULL DEFAULT '',
  PRIMARY KEY (app_id, household_id),
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Categories ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  app_id        VARCHAR(20)  NOT NULL,
  household_id  INT          NOT NULL,
  name          VARCHAR(100) NOT NULL DEFAULT '',
  color         VARCHAR(20)  NOT NULL DEFAULT '',
  PRIMARY KEY (app_id, household_id),
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Income Entries ────────────────────────────────────────────────────────────
-- Each row is one pay period entry for one month.
-- half: 1 = 1st–15th paycheck, 2 = 16th–end paycheck
CREATE TABLE IF NOT EXISTS income_entries (
  app_id        VARCHAR(20)   NOT NULL,
  household_id  INT           NOT NULL,
  month_ym      VARCHAR(7)    NOT NULL,             -- e.g. '2026-03'
  half          TINYINT       NOT NULL DEFAULT 1,   -- 1 or 2
  person        VARCHAR(100)  NOT NULL DEFAULT '',
  source        VARCHAR(100)  NOT NULL DEFAULT '',  -- 'Paycheck', 'Bonus', etc.
  amount        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  recurring     TINYINT(1)    NOT NULL DEFAULT 0,
  template_id   VARCHAR(20)   NOT NULL DEFAULT '',  -- stable cross-month ID
  PRIMARY KEY (app_id, household_id),
  INDEX idx_hh_month (household_id, month_ym),
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Budget Items ──────────────────────────────────────────────────────────────
-- Each row is one budget line item for one month.
-- due_day:  1–15 → first-half, 16–31 → second-half, 0 = not set
-- due_day2: only used when split=1 (item straddles both halves)
-- split:    item appears in both halves at half its amount
-- paid/paid1/paid2: paid status (paid1/paid2 used for split items)
CREATE TABLE IF NOT EXISTS budget_items (
  app_id        VARCHAR(20)   NOT NULL,
  household_id  INT           NOT NULL,
  month_ym      VARCHAR(7)    NOT NULL,
  name          VARCHAR(200)  NOT NULL DEFAULT '',
  amount        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  due_day       TINYINT       NOT NULL DEFAULT 0,
  due_day2      TINYINT       NOT NULL DEFAULT 0,
  account_id    VARCHAR(20)   NOT NULL DEFAULT '',
  category_id   VARCHAR(20)   NOT NULL DEFAULT '',
  recurring     TINYINT(1)    NOT NULL DEFAULT 0,
  paid          TINYINT(1)    NOT NULL DEFAULT 0,
  paid1         TINYINT(1)    NOT NULL DEFAULT 0,
  paid2         TINYINT(1)    NOT NULL DEFAULT 0,
  split         TINYINT(1)    NOT NULL DEFAULT 0,
  template_id   VARCHAR(20)   NOT NULL DEFAULT '',
  PRIMARY KEY (app_id, household_id),
  INDEX idx_hh_month (household_id, month_ym),
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Users (unchanged) ─────────────────────────────────────────────────────────
-- Login accounts. Separate from budget data — one login can use any passphrase.
CREATE TABLE IF NOT EXISTS users (
  id            INT          NOT NULL AUTO_INCREMENT,
  username      VARCHAR(60)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
