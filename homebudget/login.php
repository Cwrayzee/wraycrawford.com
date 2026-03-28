<?php
// ─────────────────────────────────────────────
// Crawford Budget — Login
// ─────────────────────────────────────────────
session_start();

if (!empty($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}

require __DIR__ . '/config.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($username === '' || $password === '') {
        $error = 'Please enter both username and password.';
    } else {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            $stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE username = ?');
            $stmt->execute([$username]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($row && password_verify($password, $row['password_hash'])) {
                session_regenerate_id(true);
                $_SESSION['user_id']  = $row['id'];
                $_SESSION['username'] = $username;
                header('Location: index.php');
                exit;
            } else {
                $error = 'Invalid username or password.';
            }
        } catch (Exception $e) {
            $error = 'Database error. Please try again.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Budget Planner — Sign In</title>
  <link rel="icon" type="image/png" href="assets/favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg:          #060d1e;
      --glass:       rgba(255,255,255,0.042);
      --glass-2:     rgba(255,255,255,0.07);
      --glass-input: rgba(255,255,255,0.06);
      --border:      rgba(255,255,255,0.07);
      --border-2:    rgba(255,255,255,0.13);
      --text:        #e2e8f0;
      --text-2:      #94a3b8;
      --accent:      #f97316;
      --accent-d:    #ea580c;
      --accent-glow: rgba(249,115,22,0.35);
      --red:         #f87171;
      --radius:      15px;
      --blur:        blur(28px);
      --transition:  0.18s ease;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Comfortaa', cursive;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background:
        radial-gradient(ellipse 70% 55% at 12% 15%,  rgba(7,89,208,.22)    0%, transparent 60%),
        radial-gradient(ellipse 55% 45% at 88% 80%,  rgba(249,115,22,.10)  0%, transparent 55%),
        radial-gradient(ellipse 40% 35% at 65% 8%,   rgba(14,165,233,.09)  0%, transparent 45%),
        radial-gradient(ellipse 60% 50% at 35% 90%,  rgba(52,211,153,.06)  0%, transparent 50%);
      pointer-events: none;
      z-index: 0;
    }

    .login-wrap {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 380px;
      padding: 1rem;
    }

    .login-card {
      background: var(--glass-2);
      backdrop-filter: var(--blur);
      -webkit-backdrop-filter: var(--blur);
      border: 1px solid var(--border-2);
      border-radius: var(--radius);
      padding: 2.5rem 2rem;
    }

    .login-logo {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 2rem;
      justify-content: center;
    }

    .login-logo img {
      width: 32px;
      height: 32px;
      image-rendering: pixelated;
    }

    .login-logo span {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--accent);
    }

    h2 {
      text-align: center;
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-2);
      margin-bottom: 1.75rem;
    }

    .field {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-2);
      margin-bottom: 0.35rem;
      letter-spacing: 0.3px;
    }

    input[type="text"],
    input[type="password"] {
      width: 100%;
      background: var(--glass-input);
      border: 1px solid var(--border-2);
      border-radius: 8px;
      color: var(--text);
      font-family: inherit;
      font-size: 0.9rem;
      padding: 0.65rem 0.85rem;
      outline: none;
      transition: border-color var(--transition), box-shadow var(--transition);
    }

    input[type="text"]:focus,
    input[type="password"]:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }

    .error-msg {
      background: rgba(248,113,113,0.1);
      border: 1px solid rgba(248,113,113,0.3);
      border-radius: 8px;
      color: var(--red);
      font-size: 0.8rem;
      padding: 0.6rem 0.85rem;
      margin-bottom: 1rem;
      text-align: center;
    }

    .btn-login {
      width: 100%;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 700;
      padding: 0.75rem;
      cursor: pointer;
      margin-top: 0.5rem;
      transition: background var(--transition), box-shadow var(--transition), transform var(--transition);
      box-shadow: 0 0 18px var(--accent-glow);
    }

    .btn-login:hover {
      background: var(--accent-d);
      box-shadow: 0 0 28px var(--accent-glow);
      transform: translateY(-1px);
    }

    .btn-login:active { transform: translateY(0); }
  </style>
</head>
<body>
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-logo">
        <img src="assets/favicon.png" alt="Budget" />
        <span>Budget Planner</span>
      </div>
      <h2>Sign in to continue</h2>

      <?php if ($error): ?>
        <div class="error-msg"><?= htmlspecialchars($error) ?></div>
      <?php endif; ?>

      <form method="POST" action="login.php" autocomplete="on">
        <div class="field">
          <label for="username">Username</label>
          <input type="text" id="username" name="username"
                 value="<?= htmlspecialchars($_POST['username'] ?? '') ?>"
                 autocomplete="username" autofocus required />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input type="password" id="password" name="password"
                 autocomplete="current-password" required />
        </div>
        <button type="submit" class="btn-login">Sign In</button>
      </form>
    </div>
  </div>
</body>
</html>
