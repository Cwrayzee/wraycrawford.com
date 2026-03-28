# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-file household budget planner (`budget-app/index.html`) with no build system, no dependencies, and no server. Open the file directly in a browser to run it.

## Development

No build, lint, or test commands. To develop:
- Edit `budget-app/index.html` directly
- Open it in a browser (or use a simple local server: `python3 -m http.server 8000`)
- All CSS, HTML, and JS live in this one file

## Architecture

**Three files, one page:**
1. `assets/budget.css` — all CSS using design tokens defined in `:root` (dark glassmorphism theme)
2. `index.html` — static HTML shell (~280 lines); dynamic content is rendered into named containers by JS
3. `assets/budget.js` — all application logic (no frameworks, vanilla JS)

**State model** (persisted to `localStorage` under key `hbp_v4`):
```
state = {
  currentMonth: "YYYY-MM",
  people:     [ { id, name } ],
  accounts:   [ { id, name } ],
  categories: [ { id, name, color } ],
  months: {
    "YYYY-MM": {
      income:      { [personId]: { pay1: {amount, recurring}, pay2: {amount, recurring} } },
      extraIncome: [ { id, name, amount, recurring, personId } ],
      items:       [ { id, name, amount, dueDay, accountId, categoryId, recurring, paid } ]
    }
  }
}
```

**Render pattern:** All functions are named `render*` or `update*`. The master `render()` calls all sub-renders. Targeted updates (e.g., `updateRunningTotals()`, `updateSummaryDisplay()`) exist to avoid full re-renders when only numbers change — preserving input focus.

**Two-half budget split:** Items are split by `dueDay` — days 1–15 go to the first half (pay period 1), days 16–31 go to the second. `itemsForHalf(half)` and `periodIncome(half)` handle this. The split drives both the layout columns and the paycheck breakdown section.

**Income model:** Each person has two pay periods (`pay1`, `pay2`) plus optional extra income entries. `periodIncome(half)` sums the matching pay period plus half of all extra income.

**Month navigation:** `changeMonth(dir)` creates new month data and carries forward items/income flagged `recurring: true`.

**Key functions to know:**
- `save()` / `load()` — read/write `localStorage`
- `monthData(ym)` — lazy-creates and returns a month's data object (also handles migration guards)
- `curItems()` — shorthand for current month's items array
- `renderItems()` → `renderHalfItems(items, tbodyId, halfIncome)` — renders the two budget table halves
- `updateHalfSummaries()` — updates per-half and cumulative footer totals
- `confirmAddItem()` — adds a new item from the modal; auto-sorts into the correct half via `dueDay`

**CSS design tokens** are all in `:root`. Prefer using existing variables (`--glass`, `--accent`, `--green`, `--red`, `--amber`, etc.) when adding new styles.
