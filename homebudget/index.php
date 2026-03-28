<?php
// ─────────────────────────────────────────────
// Crawford Budget — Auth gate
// Checks session; redirects to login if not authenticated,
// then serves the single-file app.
// ─────────────────────────────────────────────
session_start();

if (empty($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

readfile(__DIR__ . '/index.html');
