<?php
// ─────────────────────────────────────────────────────────────────────────────
// Crawford Budget — REST API (normalized schema)
//
// GET  api.php?token=X        → { ok:true, state: <object> | null }
// POST api.php  body:{token,state} → { ok:true }
//
// The JS sends/receives the same state shape it always has; this file
// reads and writes it across six normalized tables instead of one JSON blob.
// ─────────────────────────────────────────────────────────────────────────────
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

// Auth — must be logged in via PHP session
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Not authenticated.']);
    exit;
}

require __DIR__ . '/config.php';

// ── Helpers ──────────────────────────────────────────────────────────────────

function db(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

function respond(array $data, int $code = 200): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function tokenHash(string $token): string {
    return hash('sha256', $token);
}

function validateToken(string $token): bool {
    return strlen(trim($token)) >= 6;
}

// ── Load state from normalized tables ────────────────────────────────────────

function loadState(string $hash): ?array {
    $db = db();

    // Find household
    $stmt = $db->prepare('SELECT id, current_month FROM households WHERE token_hash = ?');
    $stmt->execute([$hash]);
    $household = $stmt->fetch();
    if (!$household) return null;

    $hid = (int) $household['id'];

    // People
    $s = $db->prepare('SELECT app_id AS id, name FROM people WHERE household_id = ?');
    $s->execute([$hid]);
    $people = $s->fetchAll();

    // Accounts
    $s = $db->prepare('SELECT app_id AS id, name FROM accounts WHERE household_id = ?');
    $s->execute([$hid]);
    $accounts = $s->fetchAll();

    // Categories
    $s = $db->prepare('SELECT app_id AS id, name, color FROM categories WHERE household_id = ?');
    $s->execute([$hid]);
    $categories = $s->fetchAll();

    // Income entries — all months
    $s = $db->prepare(
        'SELECT app_id, month_ym, half, person, source, amount, recurring, template_id
         FROM income_entries
         WHERE household_id = ?
         ORDER BY month_ym, half'
    );
    $s->execute([$hid]);

    // Budget items — all months
    $s2 = $db->prepare(
        'SELECT app_id, month_ym, name, amount, due_day, due_day2,
                account_id, category_id, recurring, paid, paid1, paid2, split, template_id
         FROM budget_items
         WHERE household_id = ?
         ORDER BY month_ym, due_day'
    );
    $s2->execute([$hid]);

    // Assemble months map
    $months = [];

    foreach ($s->fetchAll() as $e) {
        $ym = $e['month_ym'];
        if (!isset($months[$ym])) $months[$ym] = ['incomeEntries' => [], 'items' => []];

        $entry = [
            'id'        => $e['app_id'],
            'half'      => (int) $e['half'],
            'person'    => $e['person'],
            'source'    => $e['source'],
            'amount'    => $e['amount'],        // PDO returns DECIMAL as string e.g. "1500.00"
            'recurring' => (bool) $e['recurring'],
        ];
        // Only include templateId when set — JS checks for its existence
        if ($e['template_id'] !== '') {
            $entry['templateId'] = $e['template_id'];
        }
        $months[$ym]['incomeEntries'][] = $entry;
    }

    foreach ($s2->fetchAll() as $i) {
        $ym = $i['month_ym'];
        if (!isset($months[$ym])) $months[$ym] = ['incomeEntries' => [], 'items' => []];

        $item = [
            'id'          => $i['app_id'],
            'name'        => $i['name'],
            'amount'      => $i['amount'],      // DECIMAL as string
            'dueDay'      => (int) $i['due_day'] ?: '',   // 0 → '' (not set)
            'accountId'   => $i['account_id'],
            'categoryId'  => $i['category_id'],
            'recurring'   => (bool) $i['recurring'],
            'paid'        => (bool) $i['paid'],
            'paid1'       => (bool) $i['paid1'],
            'paid2'       => (bool) $i['paid2'],
            'split'       => (bool) $i['split'],
        ];
        if ((int) $i['due_day2'] > 0) {
            $item['dueDay2'] = (int) $i['due_day2'];
        }
        if ($i['template_id'] !== '') {
            $item['templateId'] = $i['template_id'];
        }
        $months[$ym]['items'][] = $item;
    }

    return [
        'currentMonth' => $household['current_month'],
        'people'       => $people,
        'accounts'     => $accounts,
        'categories'   => $categories,
        'months'       => empty($months) ? (object)[] : $months,
    ];
}

// ── Save state to normalized tables ──────────────────────────────────────────

function saveState(string $hash, array $state): void {
    $db = db();
    $db->beginTransaction();

    try {
        // Upsert household row
        $db->prepare(
            'INSERT INTO households (token_hash, current_month)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE
               current_month = VALUES(current_month),
               updated_at    = CURRENT_TIMESTAMP'
        )->execute([$hash, $state['currentMonth'] ?? '']);

        // Fetch the household ID (works for both INSERT and UPDATE above)
        $stmt = $db->prepare('SELECT id FROM households WHERE token_hash = ?');
        $stmt->execute([$hash]);
        $hid = (int) $stmt->fetchColumn();

        // ── People ────────────────────────────────────────────────────────────
        $db->prepare('DELETE FROM people WHERE household_id = ?')->execute([$hid]);
        $ins = $db->prepare('INSERT INTO people (app_id, household_id, name) VALUES (?, ?, ?)');
        foreach ($state['people'] ?? [] as $p) {
            $ins->execute([$p['id'], $hid, $p['name'] ?? '']);
        }

        // ── Accounts ──────────────────────────────────────────────────────────
        $db->prepare('DELETE FROM accounts WHERE household_id = ?')->execute([$hid]);
        $ins = $db->prepare('INSERT INTO accounts (app_id, household_id, name) VALUES (?, ?, ?)');
        foreach ($state['accounts'] ?? [] as $a) {
            $ins->execute([$a['id'], $hid, $a['name'] ?? '']);
        }

        // ── Categories ────────────────────────────────────────────────────────
        $db->prepare('DELETE FROM categories WHERE household_id = ?')->execute([$hid]);
        $ins = $db->prepare(
            'INSERT INTO categories (app_id, household_id, name, color) VALUES (?, ?, ?, ?)'
        );
        foreach ($state['categories'] ?? [] as $c) {
            $ins->execute([$c['id'], $hid, $c['name'] ?? '', $c['color'] ?? '']);
        }

        // ── Income entries & budget items — replace all for this household ────
        $db->prepare('DELETE FROM income_entries WHERE household_id = ?')->execute([$hid]);
        $db->prepare('DELETE FROM budget_items    WHERE household_id = ?')->execute([$hid]);

        $insIncome = $db->prepare(
            'INSERT INTO income_entries
               (app_id, household_id, month_ym, half, person, source, amount, recurring, template_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        $insItem = $db->prepare(
            'INSERT INTO budget_items
               (app_id, household_id, month_ym, name, amount,
                due_day, due_day2, account_id, category_id,
                recurring, paid, paid1, paid2, split, template_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        foreach ($state['months'] ?? [] as $ym => $md) {
            foreach ($md['incomeEntries'] ?? [] as $e) {
                $insIncome->execute([
                    $e['id']                      ?? '',
                    $hid,
                    (string) $ym,
                    (int)    ($e['half']          ?? 1),
                             $e['person']         ?? '',
                             $e['source']         ?? '',
                    (float)  ($e['amount']        ?? 0),
                    empty($e['recurring'])        ? 0 : 1,
                             $e['templateId']     ?? '',
                ]);
            }

            foreach ($md['items'] ?? [] as $i) {
                $insItem->execute([
                    $i['id']                      ?? '',
                    $hid,
                    (string) $ym,
                             $i['name']           ?? '',
                    (float)  ($i['amount']        ?? 0),
                    (int)    ($i['dueDay']        ?? 0),
                    (int)    ($i['dueDay2']       ?? 0),
                             $i['accountId']      ?? '',
                             $i['categoryId']     ?? '',
                    empty($i['recurring'])        ? 0 : 1,
                    empty($i['paid'])             ? 0 : 1,
                    empty($i['paid1'])            ? 0 : 1,
                    empty($i['paid2'])            ? 0 : 1,
                    empty($i['split'])            ? 0 : 1,
                             $i['templateId']     ?? '',
                ]);
            }
        }

        $db->commit();

    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

// ── Router ────────────────────────────────────────────────────────────────────

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $token = trim($_GET['token'] ?? '');
    if (!validateToken($token)) {
        respond(['ok' => false, 'error' => 'Token must be at least 6 characters.'], 400);
    }
    try {
        $state = loadState(tokenHash($token));
        respond($state !== null
            ? ['ok' => true, 'state' => $state]
            : ['ok' => true, 'state' => null]
        );
    } catch (Exception $e) {
        respond(['ok' => false, 'error' => 'Database error.'], 500);
    }
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) {
        respond(['ok' => false, 'error' => 'Invalid JSON body.'], 400);
    }
    $token = trim($body['token'] ?? '');
    $state = $body['state'] ?? null;
    if (!validateToken($token)) {
        respond(['ok' => false, 'error' => 'Token must be at least 6 characters.'], 400);
    }
    if ($state === null) {
        respond(['ok' => false, 'error' => 'Missing state.'], 400);
    }
    try {
        saveState(tokenHash($token), $state);
        respond(['ok' => true]);
    } catch (Exception $e) {
        respond(['ok' => false, 'error' => 'Database error.'], 500);
    }
}

respond(['ok' => false, 'error' => 'Method not allowed.'], 405);
