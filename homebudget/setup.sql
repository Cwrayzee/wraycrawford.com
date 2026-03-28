-- Crawford Budget — Database Setup
-- Run this in Bluehost cPanel → phpMyAdmin → your database → SQL tab

CREATE TABLE IF NOT EXISTS budget_state (
    token_hash  VARCHAR(64)  NOT NULL,
    state_json  LONGTEXT     NOT NULL,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(64)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
