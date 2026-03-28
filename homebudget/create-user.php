<?php
// ─────────────────────────────────────────────
// Crawford Budget — One-time user setup
// DELETE THIS FILE after creating your account!
// ─────────────────────────────────────────────
require __DIR__ . '/config.php';

$message = '';
$success = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirm  = $_POST['confirm']  ?? '';

    if ($username === '' || $password === '') {
        $message = 'Username and password are required.';
    } elseif (strlen($password) < 8) {
        $message = 'Password must be at least 8 characters.';
    } elseif ($password !== $confirm) {
        $message = 'Passwords do not match.';
    } else {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $pdo->prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
                ->execute([$username, $hash]);
            $message = "User \"$username\" created. Delete this file now, then go sign in.";
            $success = true;
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                $message = "Username \"$username\" already exists.";
            } else {
                $message = 'Database error: ' . $e->getMessage();
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Budget — Create User</title>
  <link rel="icon" type="image/png" href="assets/favicon.png" />
  <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #060d1e; --glass-2: rgba(255,255,255,0.07);
      --glass-input: rgba(255,255,255,0.06); --border-2: rgba(255,255,255,0.13);
      --text: #e2e8f0; --text-2: #94a3b8; --accent: #f97316; --accent-d: #ea580c;
      --accent-glow: rgba(249,115,22,0.35); --red: #f87171; --green: #34d399;
      --blur: blur(28px); --transition: 0.18s ease;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Comfortaa', cursive; background: var(--bg); color: var(--text);
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
    }
    body::before {
      content: ''; position: fixed; inset: 0;
      background:
        radial-gradient(ellipse 70% 55% at 12% 15%, rgba(7,89,208,.22) 0%, transparent 60%),
        radial-gradient(ellipse 55% 45% at 88% 80%, rgba(249,115,22,.10) 0%, transparent 55%);
      pointer-events: none; z-index: 0;
    }
    .wrap { position: relative; z-index: 1; width: 100%; max-width: 400px; padding: 1rem; }
    .card {
      background: var(--glass-2); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
      border: 1px solid var(--border-2); border-radius: 15px; padding: 2.5rem 2rem;
    }
    .warning {
      background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.35);
      border-radius: 8px; color: var(--accent); font-size: 0.78rem;
      padding: 0.6rem 0.85rem; margin-bottom: 1.5rem; text-align: center;
    }
    h1 { font-size: 1.1rem; font-weight: 700; color: var(--accent); margin-bottom: 0.3rem; text-align: center; }
    h2 { font-size: 0.85rem; font-weight: 400; color: var(--text-2); margin-bottom: 1.5rem; text-align: center; }
    .field { margin-bottom: 1rem; }
    label { display: block; font-size: 0.75rem; color: var(--text-2); margin-bottom: 0.35rem; }
    input[type="text"], input[type="password"] {
      width: 100%; background: var(--glass-input); border: 1px solid var(--border-2);
      border-radius: 8px; color: var(--text); font-family: inherit; font-size: 0.9rem;
      padding: 0.65rem 0.85rem; outline: none;
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    .msg {
      border-radius: 8px; font-size: 0.82rem; padding: 0.6rem 0.85rem;
      margin-bottom: 1rem; text-align: center;
    }
    .msg.error { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); color: var(--red); }
    .msg.ok    { background: rgba(52,211,153,0.1);  border: 1px solid rgba(52,211,153,0.3);  color: var(--green); }
    .btn {
      width: 100%; background: var(--accent); color: #fff; border: none; border-radius: 8px;
      font-family: inherit; font-size: 0.95rem; font-weight: 700; padding: 0.75rem;
      cursor: pointer; margin-top: 0.5rem;
      transition: background var(--transition), box-shadow var(--transition);
      box-shadow: 0 0 18px var(--accent-glow);
    }
    .btn:hover { background: var(--accent-d); box-shadow: 0 0 28px var(--accent-glow); }
    .signin-link { text-align: center; margin-top: 1.25rem; font-size: 0.82rem; color: var(--text-2); }
    .signin-link a { color: var(--accent); text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Create Account</h1>
      <h2>One-time setup — delete this file after use</h2>
      <div class="warning">This page is unprotected. Delete <code>create-user.php</code> immediately after creating your account.</div>

      <?php if ($message): ?>
        <div class="msg <?= $success ? 'ok' : 'error' ?>"><?= htmlspecialchars($message) ?></div>
      <?php endif; ?>

      <?php if (!$success): ?>
      <form method="POST" action="create-user.php" autocomplete="off">
        <div class="field">
          <label for="username">Username</label>
          <input type="text" id="username" name="username"
                 value="<?= htmlspecialchars($_POST['username'] ?? '') ?>" autofocus required />
        </div>
        <div class="field">
          <label for="password">Password (min 8 characters)</label>
          <input type="password" id="password" name="password" required />
        </div>
        <div class="field">
          <label for="confirm">Confirm Password</label>
          <input type="password" id="confirm" name="confirm" required />
        </div>
        <button type="submit" class="btn">Create Account</button>
      </form>
      <?php else: ?>
        <div class="signin-link"><a href="login.php">Go to Sign In &rarr;</a></div>
      <?php endif; ?>
    </div>
  </div>
</body>
</html>
