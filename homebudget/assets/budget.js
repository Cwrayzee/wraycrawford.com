// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────
function uid()  { return Math.random().toString(36).substr(2,9); }
function fmt(n) { return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0); }

// ─── Debounce helpers ───────────────────────────────────────────────────────
let _lazySaveTimer = null;
function lazySave() {
  clearTimeout(_lazySaveTimer);
  _lazySaveTimer = setTimeout(save, 500);
}

let _lazyBreakdownTimer = null;
function lazyRenderBreakdowns() {
  clearTimeout(_lazyBreakdownTimer);
  _lazyBreakdownTimer = setTimeout(() => {
    renderPaycheckBreakdown();
    renderAccountBreakdown();
    renderCategoryBreakdown();
  }, 350);
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function ordinal(n) {
  const s=['th','st','nd','rd'], v=n%100;
  return s[(v-20)%10]||s[v]||s[0];
}

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
// months[ym] = {
//   incomeEntries: [ { id, half:1|2, person, source, amount, recurring } ],
//   items:         [ { id, name, amount, dueDay, accountId, categoryId, recurring } ]
// }
const STORAGE_KEY = 'hbp_v4';
const API_URL     = './api.php';
let _syncToken  = localStorage.getItem('hbp_token') || '';
let _syncTimer  = null;

const CAT_COLORS = ['#60a5fa','#34d399','#fbbf24','#f97316','#38bdf8','#f87171','#2dd4bf','#fb923c','#a3e635','#f472b6','#e11d48','#94a3b8'];

const DEFAULT_CATEGORIES = [
  { name: 'Housing',                    color: '#60a5fa' },
  { name: 'Utilities',                  color: '#34d399' },
  { name: 'Groceries',                  color: '#fbbf24' },
  { name: 'Transportation',             color: '#f97316' },
  { name: 'Insurance',                  color: '#38bdf8' },
  { name: 'Healthcare',                 color: '#f87171' },
  { name: 'Dining Out & Entertainment', color: '#2dd4bf' },
  { name: 'Debt Payments',              color: '#fb923c' },
  { name: 'Savings',                    color: '#a3e635' },
  { name: 'Personal & Miscellaneous',   color: '#94a3b8' },
];

let state = {
  currentMonth: new Date().toISOString().slice(0,7),
  people:     [ { id: uid(), name: 'Person 1' }, { id: uid(), name: 'Person 2' } ],
  accounts:   [ { id: uid(), name: 'Joint Checking' } ],
  categories: [],
  months:     {}
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch(e) {}
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleRemoteSave();
}

// ─────────────────────────────────────────────
// Remote sync (PHP + MySQL backend)
// ─────────────────────────────────────────────
function setSyncStatus(status) {
  const dot = document.getElementById('sync-dot');
  const btn = document.getElementById('btn-connect');
  if (dot) {
    dot.className = 'sync-dot ' + status;
    dot.title = { idle:'Not connected', syncing:'Syncing…', synced:'Synced ✓', error:'Sync error — check connection' }[status] || status;
  }
  if (btn) {
    btn.className = 'btn-connect' + (status === 'synced' || status === 'syncing' ? ' connected' : '');
    btn.textContent = _syncToken ? '⚙ Sync' : '🔗 Connect';
  }
}

function scheduleRemoteSave() {
  if (!_syncToken) return;
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(saveRemote, 1800);
}

async function saveRemote() {
  if (!_syncToken) return;
  setSyncStatus('syncing');
  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: _syncToken, state })
    });
    if (r.status === 401) { window.location = 'login.php'; return; }
    const j = await r.json();
    setSyncStatus(j.ok ? 'synced' : 'error');
  } catch {
    setSyncStatus('error');
  }
}

async function loadRemote() {
  if (!_syncToken) return false;
  setSyncStatus('syncing');
  try {
    const r = await fetch(`${API_URL}?token=${encodeURIComponent(_syncToken)}`);
    if (r.status === 401) { window.location = 'login.php'; return false; }
    const j = await r.json();
    if (j.ok && j.state) {
      state = j.state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSyncStatus('synced');
      return true;
    }
    setSyncStatus(j.ok ? 'idle' : 'error');
  } catch {
    setSyncStatus('error');
  }
  return false;
}

// ─────────────────────────────────────────────
// Connect modal
// ─────────────────────────────────────────────
function openConnectModal() {
  const overlay = document.getElementById('connect-overlay');
  const input   = document.getElementById('connect-passphrase');
  const errEl   = document.getElementById('connect-error');
  const statEl  = document.getElementById('connect-status');
  const cancelBtn = document.getElementById('connect-cancel-btn');
  if (_syncToken) {
    input.value = '';
    statEl.textContent = 'Currently connected. Enter a new passphrase to switch, or leave blank and click Disconnect.';
    cancelBtn.style.display = '';
  } else {
    input.value = '';
    statEl.textContent = '';
    cancelBtn.style.display = 'none';
  }
  errEl.textContent = '';
  overlay.classList.add('open');
  setTimeout(() => input.focus(), 100);
}

function closeConnectModal() {
  document.getElementById('connect-overlay').classList.remove('open');
}

async function connectConfirm() {
  const input  = document.getElementById('connect-passphrase');
  const errEl  = document.getElementById('connect-error');
  const statEl = document.getElementById('connect-status');
  const phrase = input.value.trim();

  if (!phrase && _syncToken) {
    _syncToken = '';
    localStorage.removeItem('hbp_token');
    setSyncStatus('idle');
    closeConnectModal();
    return;
  }

  if (phrase.length < 6) {
    errEl.textContent = 'Passphrase must be at least 6 characters.';
    return;
  }

  errEl.textContent   = '';
  statEl.textContent  = 'Connecting…';
  input.disabled      = true;

  const prevToken = _syncToken;
  _syncToken = phrase;
  setSyncStatus('syncing');

  try {
    const r = await fetch(`${API_URL}?token=${encodeURIComponent(phrase)}`);
    if (r.status === 401) { window.location = 'login.php'; return; }
    const j = await r.json();

    if (!j.ok) {
      throw new Error(j.error || 'Server error');
    }

    if (j.state) {
      state = j.state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem('hbp_token', phrase);
      setSyncStatus('synced');
      statEl.textContent = 'Connected! Loading your data…';
      setTimeout(() => {
        closeConnectModal();
        render(0, 0);
      }, 600);
    } else {
      const pr = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: phrase, state })
      });
      const pj = await pr.json();
      if (!pj.ok) throw new Error(pj.error || 'Save failed');
      localStorage.setItem('hbp_token', phrase);
      setSyncStatus('synced');
      statEl.textContent = 'Connected! Your data has been saved to the cloud.';
      setTimeout(closeConnectModal, 900);
    }
  } catch (e) {
    _syncToken = prevToken;
    setSyncStatus(prevToken ? 'synced' : 'idle');
    errEl.textContent = 'Could not connect: ' + (e.message || 'network error');
    statEl.textContent = '';
  } finally {
    input.disabled = false;
  }
}

// ─────────────────────────────────────────────
// Per-month accessors (with migration guards)
// ─────────────────────────────────────────────
function monthData(ym) {
  if (!state.months[ym]) {
    state.months[ym] = { incomeEntries: [], items: [] };
  }
  const md = state.months[ym];
  if (!md.incomeEntries && (md.income || md.extraIncome)) {
    const entries = [];
    const oldInc = md.income || {};
    const oldExtra = md.extraIncome || [];
    state.people.forEach(p => {
      const pi = oldInc[p.id];
      if (pi) {
        const pay1 = typeof pi.pay1 === 'object' ? pi.pay1 : { amount: String(pi.pay1||''), recurring: false };
        const pay2 = typeof pi.pay2 === 'object' ? pi.pay2 : { amount: String(pi.pay2||''), recurring: false };
        if (pay1.amount) entries.push({ id: uid(), half: 1, person: p.name, source: 'Paycheck', amount: pay1.amount, recurring: !!pay1.recurring });
        if (pay2.amount) entries.push({ id: uid(), half: 2, person: p.name, source: 'Paycheck', amount: pay2.amount, recurring: !!pay2.recurring });
      }
    });
    oldExtra.forEach(e => {
      const person = state.people.find(p => p.id === e.personId);
      entries.push({ id: uid(), half: 1, person: person ? person.name : '', source: e.name || '', amount: e.amount || '', recurring: !!e.recurring });
    });
    md.incomeEntries = entries;
    delete md.income;
    delete md.extraIncome;
    save();
  }
  if (!md.incomeEntries) md.incomeEntries = [];
  return md;
}

function curData()           { return monthData(state.currentMonth); }
function curItems()          { return curData().items; }
function curIncomeEntries()  { return curData().incomeEntries; }
function halfEntries(half)   { return curIncomeEntries().filter(e => e.half === half); }

// ─────────────────────────────────────────────
// Derived totals
// ─────────────────────────────────────────────
function totalIncome(ym) {
  ym = ym || state.currentMonth;
  return (monthData(ym).incomeEntries || []).reduce((s,e) => s+(parseFloat(e.amount)||0), 0);
}
function totalBudgeted() {
  return curItems().reduce((s,i)=>s+(parseFloat(i.amount)||0),0);
}
function sortedItems() {
  return [...curItems()].sort((a,b)=>(parseInt(a.dueDay)||0)-(parseInt(b.dueDay)||0));
}
function itemsForHalf(half) {
  const s = sortedItems();
  return half === 1
    ? s.filter(i => i.split || (parseInt(i.dueDay)||0) <= 15)
    : s.filter(i => i.split || (parseInt(i.dueDay)||0) >= 16);
}
// Split items show at half their amount in each half so totals stay correct
function effectiveAmount(item) {
  return (parseFloat(item.amount)||0) * (item.split ? 0.5 : 1);
}
function periodIncome(half) {
  return halfEntries(half).reduce((s,e) => s+(parseFloat(e.amount)||0), 0);
}

// ─────────────────────────────────────────────
// Month navigation
// ─────────────────────────────────────────────
function changeMonth(dir) {
  const [y,m] = state.currentMonth.split('-').map(Number);
  const d = new Date(y, m-1+dir, 1);
  const newMonth = d.toISOString().slice(0,7);

  let carriedItems = 0, carriedIncome = 0;

  if (!state.months[newMonth]) {
    state.months[newMonth] = { incomeEntries: [], items: [] };
  }

  // When navigating forward, sync recurring items from current month → target month.
  // templateId is the stable cross-month key: items with the same templateId are the
  // "same" recurring entry across months. This lets us add new ones and remove stale
  // ones without touching entries the user has already paid or manually modified.
  if (dir === 1) {
    const prev   = monthData(state.currentMonth);
    const target = state.months[newMonth];

    // ── Budget items ─────────────────────────────────────────────────────────
    const recurItems = prev.items.filter(i => i.recurring);

    // Ensure every recurring item has a templateId (assigned once, stable forever)
    recurItems.forEach(i => { if (!i.templateId) i.templateId = i.id; });

    // Remove carried items only when the source month explicitly has that item
    // marked recurring: false. If the source month doesn't know about the item
    // at all (e.g. an empty past month), leave the target item alone.
    target.items = target.items.filter(i => {
      if (!i.templateId) return true;
      const src = prev.items.find(r => r.templateId === i.templateId);
      return !src || src.recurring;
    });

    // Add any recurring item not yet present in the target month.
    // Before adding, try to claim an existing untagged entry that looks like
    // the same item (migration path for months created by the old carry code).
    recurItems.forEach(i => {
      let existing = target.items.find(x => x.templateId === i.templateId);
      if (!existing) {
        existing = target.items.find(x =>
          !x.templateId && x.name === i.name &&
          x.accountId === i.accountId && x.categoryId === i.categoryId
        );
        if (existing) existing.templateId = i.templateId;
      }
      if (!existing) {
        target.items.push({ ...i, id: uid(), paid: false });
        carriedItems++;
      }
    });

    // ── Income entries ────────────────────────────────────────────────────────
    const recurIncome = prev.incomeEntries.filter(e => e.recurring);

    recurIncome.forEach(e => { if (!e.templateId) e.templateId = e.id; });

    // Same rule for income: only remove if source explicitly marks it non-recurring.
    target.incomeEntries = target.incomeEntries.filter(e => {
      if (!e.templateId) return true;
      const src = prev.incomeEntries.find(r => r.templateId === e.templateId);
      return !src || src.recurring;
    });

    // Same migration approach: claim matching untagged entries before adding new ones.
    recurIncome.forEach(e => {
      let existing = target.incomeEntries.find(x => x.templateId === e.templateId);
      if (!existing) {
        existing = target.incomeEntries.find(x =>
          !x.templateId && x.person === e.person &&
          x.source === e.source && x.half === e.half
        );
        if (existing) existing.templateId = e.templateId;
      }
      if (!existing) {
        target.incomeEntries.push({ ...e, id: uid() });
        carriedIncome++;
      }
    });
  }

  state.currentMonth = newMonth;
  save();
  render(carriedItems, carriedIncome);
}

function monthLabel(ym) {
  const [y,m] = ym.split('-').map(Number);
  return new Date(y,m-1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
}

// ─────────────────────────────────────────────
// Income — paycheck cards (half 1 and half 2)
// ─────────────────────────────────────────────
function renderIncome() {
  document.getElementById('income-grid').innerHTML = [1, 2].map(half => {
    const entries = halfEntries(half);
    const total   = periodIncome(half);
    const label   = half === 1 ? '1st – 15th' : '16th – End';
    const badge   = half === 1 ? 'PAY 1' : 'PAY 2';

    const rows = entries.map(e => `
      <div class="income-entry-row">
        <input class="e-input" value="${esc(e.person)}" placeholder="Person"
          oninput="incomeEntryById('${e.id}').person=this.value; lazySave();" />
        <input class="e-input" value="${esc(e.source)}" placeholder="Source (Paycheck, Bonus…)"
          oninput="incomeEntryById('${e.id}').source=this.value; lazySave();" />
        <input class="e-input" type="number" min="0" step="0.01"
          value="${esc(e.amount)}" placeholder="0.00"
          oninput="incomeEntryById('${e.id}').amount=this.value; lazySave();
                   updateSummaryDisplay(); updateRunningTotals(); lazyRenderBreakdowns(); updateIncomeTotal(${half});" />
        <div class="extra-recur-wrap">
          <label class="toggle" title="${e.recurring?'Recurring — will carry to next month':'Mark as recurring'}">
            <input type="checkbox" ${e.recurring?'checked':''}
              onchange="incomeEntryById('${e.id}').recurring=this.checked; save(); renderIncome();" />
            <span class="toggle-slider"></span>
          </label>
          <span class="recur-label ${e.recurring?'active':''}">↻</span>
        </div>
        <button class="btn-del-sm" onclick="deleteIncomeEntry('${e.id}')" title="Remove">&#x1F5D1;</button>
      </div>`).join('');

    return `
      <div class="paycheck-card">
        <div class="paycheck-header">
          <div class="paycheck-title">
            <span class="pay-badge">${badge}</span>
            <span class="pay-period-label">${label} Paycheck</span>
          </div>
          <button class="btn-sm" onclick="addIncomeEntry(${half})">+ Add</button>
        </div>
        ${entries.length ? `
        <div class="income-entry-header">
          <span>Person</span><span>Source</span><span>Amount</span><span></span><span></span>
        </div>` : ''}
        ${entries.length
          ? rows
          : '<div class="extra-income-empty">No entries yet. Click "+ Add" to add a paycheck or income source.</div>'}
        <div class="paycheck-total">
          Period total: <strong id="inc-total-${half}">${fmt(total)}</strong>
        </div>
      </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// Income entry helpers
// ─────────────────────────────────────────────
function incomeEntryById(id) {
  return curIncomeEntries().find(e => e.id === id);
}

function addIncomeEntry(half) {
  curIncomeEntries().push({ id: uid(), half, person: '', source: '', amount: '', recurring: false });
  save();
  renderIncome();
  updateSummaryDisplay();
  setTimeout(() => {
    const rows = document.querySelectorAll('.income-entry-row');
    if (rows.length) rows[rows.length-1]?.querySelector('.e-input')?.focus();
  }, 30);
}

function deleteIncomeEntry(id) {
  curData().incomeEntries = curIncomeEntries().filter(e => e.id !== id);
  save();
  renderIncome();
  updateSummaryDisplay();
  updateRunningTotals();
  renderPaycheckBreakdown();
}

// Targeted update — refreshes period total without re-rendering inputs
function updateIncomeTotal(half) {
  const el = document.getElementById(`inc-total-${half}`);
  if (el) el.textContent = fmt(periodIncome(half));
}

// ─────────────────────────────────────────────
// Accounts
// ─────────────────────────────────────────────
function renderAccounts() {
  const el = document.getElementById('accounts-list');
  if (!state.accounts.length) {
    el.innerHTML = '<span style="color:var(--text-3);font-size:.82rem">No accounts yet.</span>';
    return;
  }
  el.innerHTML = state.accounts.map(a=>`
    <div class="acct-tag">
      ${esc(a.name)}
      <button onclick="deleteAccount('${a.id}')" title="Remove">&times;</button>
    </div>`).join('');
}

function addAccount() {
  const inp = document.getElementById('new-acct-input');
  const name = inp.value.trim();
  if (!name) return;
  state.accounts.push({ id: uid(), name });
  inp.value = '';
  save();
  renderAccounts();
  renderItems();
  renderAccountBreakdown();
}

function deleteAccount(id) {
  const used = curItems().some(i=>i.accountId===id);
  if (used && !confirm('This account is used by budget items. Remove it anyway?')) return;
  state.accounts = state.accounts.filter(a=>a.id!==id);
  Object.values(state.months).forEach(md=>{
    (md.items||[]).forEach(i=>{ if(i.accountId===id) i.accountId=''; });
  });
  save();
  renderAccounts();
  renderItems();
  renderAccountBreakdown();
}

// ─────────────────────────────────────────────
// Budget Items — full render
// ─────────────────────────────────────────────
function renderHalfItems(items, tbodyId, halfIncome, half) {
  const tbody = document.getElementById(tbodyId);
  if (!items.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9">No items yet. Click "+ Add Item" below.</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(item => {
    const dueFld  = (item.split && half === 2) ? 'dueDay2' : 'dueDay';
    const dueNum  = parseInt(item[dueFld])||0;
    const chipClass = dueNum>0&&dueNum<=15?'chip-early': dueNum>15?'chip-late':'';
    const isRecur = !!item.recurring;

    const acctOpts = [
      '<option value="">— No account —</option>',
      ...state.accounts.map(a=>`<option value="${a.id}" ${a.id===item.accountId?'selected':''}>${esc(a.name)}</option>`)
    ].join('');

    const cat     = catById(item.categoryId);
    const catOpts = [
      '<option value="">— No category —</option>',
      ...state.categories.map(c=>`<option value="${c.id}" ${c.id===item.categoryId?'selected':''}>${esc(c.name)}</option>`)
    ].join('');

    const paidField = item.split ? (half === 1 ? 'paid1' : 'paid2') : 'paid';
    const isPaid  = !!item[paidField];

    return `
      <tr class="${isPaid?'row-paid':''}">
        <td>
          <input class="t-input" value="${esc(item.name)}" placeholder="Item name"
            oninput="itemFieldLazy('${item.id}','name',this.value)" />
          ${isRecur?'<span class="recur-badge">&#8635; recurring</span>':''}
          ${item.split?'<span class="split-badge">÷2</span>':''}
        </td>
        <td>
          <input class="t-input" type="number" min="0" step="0.01"
            value="${item.amount !== '' && item.amount != null ? effectiveAmount(item) : ''}" placeholder="0.00" style="width:80px"
            oninput="itemAmountSplit('${item.id}',this.value,${!!item.split})" />
        </td>
        <td>
          ${dueNum>0
            ? `<span class="due-chip ${chipClass}" style="cursor:pointer" title="Click to edit" onclick="editDueDay('${item.id}',this,'${dueFld}')">${dueNum}${ordinal(dueNum)}</span>`
            : `<button class="due-set-btn" onclick="editDueDay('${item.id}',this,'${dueFld}')">Set</button>`}
        </td>
        <td>
          <select class="t-select"
            onchange="itemField('${item.id}','accountId',this.value); renderAccountBreakdown(); renderPaycheckBreakdown();">
            ${acctOpts}
          </select>
        </td>
        <td>
          <select class="t-select" ${cat?`style="color:${cat.color}"`:''}
            onchange="itemField('${item.id}','categoryId',this.value); renderCategoryBreakdown();">
            ${catOpts}
          </select>
        </td>
        <td>
          <div class="toggle-wrap">
            <label class="toggle" title="${isRecur?'Recurring':'Mark as recurring'}">
              <input type="checkbox" ${isRecur?'checked':''}
                onchange="toggleRecurring('${item.id}',this.checked)" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </td>
        <td class="c">
          <input type="checkbox" class="paid-check" ${isPaid?'checked':''}
            title="${isPaid?'Paid':'Mark as paid'}"
            onchange="togglePaid('${item.id}','${paidField}',this.checked)" />
        </td>
        <td class="c">
          <input type="checkbox" class="split-check" ${item.split?'checked':''}
            title="${item.split?'Split: appears in both halves at ½ amount':'Mark as split payment'}"
            onchange="toggleSplit('${item.id}',this.checked)" />
        </td>
        <td class="item-actions">
          <button class="btn-edit-item${item.note ? ' has-note' : ''}"
            onclick="openEditItemModal('${item.id}')"
            title="${item.note ? esc(item.note) : 'Edit item / add note'}">&#9998;</button>
          <button class="btn-del" onclick="deleteItem('${item.id}')" title="Delete">&#x1F5D1;</button>
        </td>
      </tr>`;
  }).join('');
}

function renderItems() {
  const inc1   = periodIncome(1);
  const inc2   = periodIncome(2);
  const items1 = _applySortToItems(itemsForHalf(1), 1);
  const items2 = _applySortToItems(itemsForHalf(2), 2);
  renderHalfItems(items1, 'items-tbody-1', inc1, 1);
  renderHalfItems(items2, 'items-tbody-2', inc2, 2);
  updateHalfSummaries(items1, items2, inc1, inc2);
  _updateSortIndicators();
}

// Targeted update — preserves input focus
function updateRunningTotals() {
  const inc1   = periodIncome(1);
  const inc2   = periodIncome(2);
  const items1 = _applySortToItems(itemsForHalf(1), 1);
  const items2 = _applySortToItems(itemsForHalf(2), 2);
  updateHalfSummaries(items1, items2, inc1, inc2);
}

// ─────────────────────────────────────────────
// Item mutations
// ─────────────────────────────────────────────
function itemField(id, field, value) {
  const item = curItems().find(i=>i.id===id);
  if (item) { item[field]=value; save(); }
}
// Lazy variant for text oninput — mutates state immediately, defers save
function itemFieldLazy(id, field, value) {
  const item = curItems().find(i=>i.id===id);
  if (item) { item[field]=value; lazySave(); }
}
function itemAmount(id, value) {
  itemField(id,'amount',value);
  updateRunningTotals();
  updateSummaryDisplay();
  renderPaycheckBreakdown();
  renderAccountBreakdown();
  renderCategoryBreakdown();
}
// For split items the field shows half the amount, so double it before storing
function itemAmountSplit(id, displayValue, isSplit) {
  const store = isSplit ? String((parseFloat(displayValue)||0) * 2) : displayValue;
  itemFieldLazy(id, 'amount', store);
  updateRunningTotals();
  updateSummaryDisplay();
  lazyRenderBreakdowns();
}
function toggleRecurring(id, checked) {
  const item = curItems().find(i => i.id === id);
  if (!item) return;
  item.recurring = checked;
  // Assign a stable templateId the first time recurring is enabled so this item
  // can be tracked and synced correctly across months.
  if (checked && !item.templateId) item.templateId = item.id;
  save();
  renderItems();
}
function togglePaid(id, field, checked) {
  itemField(id, field, checked);
  renderItems();
}
function toggleSplit(id, checked) {
  itemField(id,'split',checked);
  renderItems();
  updateSummaryDisplay();
  renderPaycheckBreakdown();
}

function editDueDay(id, el, field) {
  field = field || 'dueDay';
  const item = curItems().find(i => i.id === id);
  if (!item) return;
  const inp = document.createElement('input');
  inp.type = 'number'; inp.min = 1; inp.max = 31;
  inp.value = item[field] || '';
  inp.className = 't-input';
  inp.style.width = '52px';
  el.replaceWith(inp);
  inp.focus(); inp.select();
  inp.addEventListener('blur', () => {
    itemField(id, field, inp.value);
    renderItems();
    updateSummaryDisplay();
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { inp.blur(); }
    if (e.key === 'Escape') { inp.value = item[field]; inp.blur(); }
  });
}
function deleteItem(id) {
  curData().items = curItems().filter(i=>i.id!==id);
  save();
  renderItems();
  updateSummaryDisplay();
  renderPaycheckBreakdown();
  renderAccountBreakdown();
  renderCategoryBreakdown();
}

// ─────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────
function catById(id) { return state.categories.find(c => c.id === id); }

function renderCategories() {
  const el = document.getElementById('cat-list');
  if (!state.categories.length) {
    el.innerHTML = '<div class="extra-income-empty">No categories yet.</div>';
    return;
  }
  el.innerHTML = state.categories.map(cat => `
    <div class="cat-row">
      <span class="cat-dot" style="background:${cat.color}"></span>
      <input class="cat-name-input" value="${esc(cat.name)}" placeholder="Category name"
        oninput="updateCategoryName('${cat.id}',this.value)" />
      <input type="color" class="cat-clr-input" value="${cat.color}" title="Pick color"
        onchange="updateCategoryColor('${cat.id}',this.value)" />
      <button class="btn-del-sm" onclick="deleteCategory('${cat.id}')" title="Remove">&#x1F5D1;</button>
    </div>`).join('');
}

function addCategory() {
  const inp  = document.getElementById('new-cat-input');
  const name = inp.value.trim();
  if (!name) return;
  const color = CAT_COLORS[state.categories.length % CAT_COLORS.length];
  state.categories.push({ id: uid(), name, color });
  inp.value = '';
  save();
  renderCategories();
  renderItems();
}

function deleteCategory(id) {
  const used = curItems().some(i => i.categoryId === id);
  if (used && !confirm('This category is used by budget items. Remove it anyway?')) return;
  state.categories = state.categories.filter(c => c.id !== id);
  Object.values(state.months).forEach(md => {
    (md.items||[]).forEach(i => { if (i.categoryId === id) i.categoryId = ''; });
  });
  save();
  renderCategories();
  renderItems();
  renderCategoryBreakdown();
}

function updateCategoryName(id, name) {
  const c = catById(id);
  if (!c) return;
  c.name = name; save();
  document.querySelectorAll(`option[value="${id}"]`).forEach(opt => opt.textContent = name);
  renderCategoryBreakdown();
}

function updateCategoryColor(id, color) {
  const c = catById(id);
  if (!c) return;
  c.color = color; save();
  renderCategories();
  renderItems();
  renderCategoryBreakdown();
}

// ─────────────────────────────────────────────
// Category Breakdown — donut chart
// ─────────────────────────────────────────────
function _donutSVG(data, total) {
  if (!total) return '';
  const size = 200, cx = 100, cy = 100, R = 82, ri = 50;
  let angle = -Math.PI / 2;
  const segs = data.map(d => {
    if (!d.amount) return '';
    const sweep = (d.amount / total) * 2 * Math.PI;
    const safeEnd = angle + (sweep > 2 * Math.PI - 0.001 ? 2 * Math.PI - 0.001 : sweep);
    const lg = sweep > Math.PI ? 1 : 0;
    const x1 = (cx + R * Math.cos(angle)).toFixed(2),   y1 = (cy + R * Math.sin(angle)).toFixed(2);
    const x2 = (cx + R * Math.cos(safeEnd)).toFixed(2), y2 = (cy + R * Math.sin(safeEnd)).toFixed(2);
    const x3 = (cx + ri * Math.cos(safeEnd)).toFixed(2),y3 = (cy + ri * Math.sin(safeEnd)).toFixed(2);
    const x4 = (cx + ri * Math.cos(angle)).toFixed(2),  y4 = (cy + ri * Math.sin(angle)).toFixed(2);
    const path = `M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${x3} ${y3} A ${ri} ${ri} 0 ${lg} 0 ${x4} ${y4} Z`;
    angle += sweep;
    return `<path d="${path}" fill="${d.color}" stroke="rgba(6,13,30,0.9)" stroke-width="2.5"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    ${segs}
    <text x="${cx}" y="${cy-5}" text-anchor="middle" style="fill:var(--text);font-weight:800;font-size:13px;font-family:Comfortaa,cursive">${fmt(total)}</text>
    <text x="${cx}" y="${cy+13}" text-anchor="middle" style="fill:var(--text-3);font-size:8px;font-family:Comfortaa,cursive;letter-spacing:0.8px">BUDGETED</text>
  </svg>`;
}

function renderCategoryBreakdown() {
  const el = document.getElementById('cat-bd-grid');
  const data = [];

  state.categories.forEach(cat => {
    const catItems = curItems().filter(i => i.categoryId === cat.id);
    if (!catItems.length) return;
    const amount = catItems.reduce((s,i) => s+(parseFloat(i.amount)||0), 0);
    data.push({ name: cat.name, color: cat.color, amount });
  });

  const uncatItems = curItems().filter(i => !i.categoryId);
  if (uncatItems.length) {
    const amount = uncatItems.reduce((s,i) => s+(parseFloat(i.amount)||0), 0);
    data.push({ name: 'Uncategorized', color: '#4b5563', amount });
  }

  if (!data.length) {
    el.innerHTML = '<span style="color:var(--text-3);font-size:.82rem">Assign categories to budget items to see spending by category.</span>';
    return;
  }

  const total = data.reduce((s,d) => s+d.amount, 0);
  const legend = data.map(d => {
    const pct = total > 0 ? ((d.amount / total) * 100).toFixed(1) : '0.0';
    return `<div class="chart-legend-row">
      <span class="chart-legend-dot" style="background:${d.color}"></span>
      <span class="chart-legend-name">${esc(d.name)}</span>
      <span class="chart-legend-pct">${pct}%</span>
      <span class="chart-legend-amt">${fmt(d.amount)}</span>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="donut-wrap">
    <div class="donut-svg">${_donutSVG(data, total)}</div>
    <div class="chart-legend">${legend}</div>
  </div>`;
}

// ─────────────────────────────────────────────
// Summary bar
// ─────────────────────────────────────────────
function updateHalfSummaries(items1, items2, inc1, inc2) {
  const total1 = items1.reduce((s,i)=>s+effectiveAmount(i),0);
  const total2 = items2.reduce((s,i)=>s+effectiveAmount(i),0);
  const rem1   = inc1 - total1;
  const rem2   = inc2 - total2;

  const t1El = document.getElementById('half1-income');
  t1El.textContent = fmt(rem1)+' left';
  t1El.className   = 'half-panel-income '+(rem1<0?'clr-red': rem1<inc1*0.05?'clr-amber':'clr-green');

  const t2El = document.getElementById('half2-income');
  t2El.textContent = fmt(rem2)+' left';
  t2El.className   = 'half-panel-income '+(rem2<0?'clr-red': rem2<inc2*0.05?'clr-amber':'clr-green');
  document.getElementById('half1-total').textContent  = fmt(total1);
  document.getElementById('half2-total').textContent  = fmt(total2);

  const r1El = document.getElementById('half1-remaining');
  r1El.textContent = fmt(rem1);
  r1El.className   = rem1<0?'clr-red': rem1<inc1*0.05?'clr-amber':'clr-green';

  const r2El = document.getElementById('half2-remaining');
  r2El.textContent = fmt(rem2);
  r2El.className   = rem2<0?'clr-red': rem2<inc2*0.05?'clr-amber':'clr-green';

  const cumInc  = inc1 + inc2;
  const cumBudg = total1 + total2;
  const cumRem  = cumInc - cumBudg;

  document.getElementById('cum-income').textContent   = fmt(cumInc);
  document.getElementById('cum-budgeted').textContent = fmt(cumBudg);
  const cumEl = document.getElementById('cum-remaining');
  cumEl.textContent = fmt(cumRem);
  cumEl.className   = cumRem<0?'clr-red': cumRem===0?'clr-text':'clr-green';
}

function updateSummaryDisplay() {
  const income    = totalIncome();
  const budgeted  = totalBudgeted();
  const remaining = income - budgeted;
  document.getElementById('sum-income').textContent   = fmt(income);
  document.getElementById('sum-budgeted').textContent = fmt(budgeted);
  const remEl = document.getElementById('sum-remaining');
  remEl.textContent = fmt(remaining);
  remEl.className   = 's-value '+(remaining<0?'clr-red': remaining===0?'clr-text':'clr-green');

  const items1 = itemsForHalf(1);
  const items2 = itemsForHalf(2);
  updateHalfSummaries(items1, items2, periodIncome(1), periodIncome(2));
}

// ─────────────────────────────────────────────
// Paycheck Breakdown
// ─────────────────────────────────────────────
function renderPaycheckBreakdown() {
  const periods = [
    { label:'Pay Period 1 — 1st to 15th', half: 1, range:[1,15]  },
    { label:'Pay Period 2 — 16th to End',  half: 2, range:[16,31] }
  ];

  document.getElementById('pc-grid').innerHTML = periods.map(period => {
    const income   = periodIncome(period.half);
    const entries  = halfEntries(period.half);

    const expenses = sortedItems().filter(item => {
      const d = parseInt(item.dueDay)||0;
      return item.split || (d >= period.range[0] && d <= period.range[1]);
    });
    const totalExp  = expenses.reduce((s,i)=>s+effectiveAmount(i),0);
    const remaining = income - totalExp;
    const remClass  = remaining<0?'clr-red': remaining<income*0.05?'clr-amber':'clr-green';

    const incomeRows = entries.map(e => `
      <div class="pc-income-row">
        <span class="pir-name">
          ${e.recurring?'<span class="per-recur-dot"></span>':''}${esc(e.person)||'<em style="color:var(--text-3)">Unknown</em>'}
          ${e.source?`<span style="color:var(--text-3)"> — ${esc(e.source)}</span>`:''}
        </span>
        <span class="pir-val">${fmt(parseFloat(e.amount)||0)}</span>
      </div>`).join('') || '<div style="color:var(--text-3);font-size:.78rem;padding:.2rem 0">No income entries.</div>';

    const expRows = expenses.length
      ? expenses.map(item => {
          const acct = state.accounts.find(a=>a.id===item.accountId);
          return `<div class="pc-expense-row">
            <div>
              <div class="per-name">
                ${item.recurring?'<span class="per-recur-dot"></span>':''}${esc(item.name)||'<em style="color:var(--text-3)">Unnamed</em>'}
              </div>
              <div class="per-meta">
                ${item.dueDay?`Due: ${item.dueDay}${ordinal(parseInt(item.dueDay))}`:''}
                ${acct?` &middot; ${esc(acct.name)}`:''}
              </div>
            </div>
            <span class="per-amt">&minus;${fmt(effectiveAmount(item))}${item.split?'<span class="split-badge" style="margin-left:4px">÷2</span>':''}</span>
          </div>`;
        }).join('')
      : `<div style="color:var(--text-3);font-size:.78rem;padding:.2rem 0">No expenses due this period.</div>`;

    return `
      <div class="pc-panel">
        <h3>${period.label}</h3>
        ${incomeRows}
        <div class="pc-income-total">
          <span class="pit-label">Period income</span>
          <span class="pit-val">${fmt(income)}</span>
        </div>
        <div class="pc-sub-label">Expenses</div>
        ${expRows}
        <hr class="pc-divider"/>
        <div class="pc-remaining">
          <span class="pcr-label">Remaining</span>
          <span class="pcr-val ${remClass}">${fmt(remaining)}</span>
        </div>
      </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// Account Breakdown — horizontal bar chart
// ─────────────────────────────────────────────
function renderAccountBreakdown() {
  const el = document.getElementById('ab-grid');
  if (!state.accounts.length) {
    el.innerHTML = '<span style="color:var(--text-3);font-size:.82rem">No accounts set up yet.</span>';
    return;
  }

  const data = state.accounts.map(acct => {
    const acctItems = curItems().filter(i => i.accountId === acct.id);
    const total = acctItems.reduce((s,i) => s+(parseFloat(i.amount)||0), 0);
    return { name: acct.name, total, count: acctItems.length };
  }).filter(d => d.total > 0);

  if (!data.length) {
    el.innerHTML = '<span style="color:var(--text-3);font-size:.82rem">No spending assigned to accounts yet.</span>';
    return;
  }

  const max = Math.max(...data.map(d => d.total));
  const rows = data.map(d => {
    const pct = max > 0 ? (d.total / max * 100).toFixed(1) : 0;
    return `<div class="acct-bar-row">
      <div class="acct-bar-label">${esc(d.name)}</div>
      <div class="acct-bar-track">
        <div class="acct-bar-fill" style="width:${pct}%"></div>
      </div>
      <div class="acct-bar-amount">${fmt(d.total)}</div>
      <div class="acct-bar-count">${d.count} item${d.count!==1?'s':''}</div>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="acct-bar-chart">${rows}</div>`;
}

// ─────────────────────────────────────────────
// Table sort state
// ─────────────────────────────────────────────
const _sort = {
  1: { col: 'dueDay', dir: 'asc' },
  2: { col: 'dueDay', dir: 'asc' }
};

const _SORT_COLS = ['name', 'amount', 'dueDay', 'account', 'category'];

function sortHalf(half, col) {
  const s = _sort[half];
  s.dir = (s.col === col && s.dir === 'asc') ? 'desc' : 'asc';
  s.col = col;
  renderItems();
}

function _applySortToItems(items, half) {
  const { col, dir } = _sort[half];
  return [...items].sort((a, b) => {
    let va, vb;
    if (col === 'name') {
      va = (a.name || '').toLowerCase();
      vb = (b.name || '').toLowerCase();
    } else if (col === 'amount') {
      va = effectiveAmount(a);
      vb = effectiveAmount(b);
    } else if (col === 'dueDay') {
      va = parseInt(a.dueDay) || 0;
      vb = parseInt(b.dueDay) || 0;
    } else if (col === 'account') {
      va = (state.accounts.find(ac => ac.id === a.accountId)?.name || '').toLowerCase();
      vb = (state.accounts.find(ac => ac.id === b.accountId)?.name || '').toLowerCase();
    } else if (col === 'category') {
      va = (catById(a.categoryId)?.name || '').toLowerCase();
      vb = (catById(b.categoryId)?.name || '').toLowerCase();
    } else { return 0; }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ?  1 : -1;
    return 0;
  });
}

function _updateSortIndicators() {
  [1, 2].forEach(half => {
    const { col, dir } = _sort[half];
    _SORT_COLS.forEach(c => {
      const el = document.getElementById(`th${half}-${c}`);
      if (!el) return;
      const icon = el.querySelector('.sort-icon');
      if (c === col) {
        el.classList.add('sort-active');
        icon.textContent = dir === 'asc' ? '↑' : '↓';
      } else {
        el.classList.remove('sort-active');
        icon.textContent = '';
      }
    });
  });
}

// ─────────────────────────────────────────────
// Half tabs
// ─────────────────────────────────────────────
let _activeHalf = 1;

function switchHalfTab(half) {
  _activeHalf = half;
  [1, 2].forEach(h => {
    document.getElementById(`tab-btn-${h}`).classList.toggle('active', h === half);
    document.getElementById(`tab-panel-${h}`).classList.toggle('active', h === half);
  });
}

// ─────────────────────────────────────────────
// Collapsible sections
// ─────────────────────────────────────────────
function toggleSection(id) {
  const el   = document.getElementById(id);
  const body = el.querySelector('.section-body');
  if (el.classList.contains('collapsed')) {
    el.classList.remove('collapsed');
    body.style.maxHeight = body.scrollHeight + 'px';
    body.addEventListener('transitionend', () => { body.style.maxHeight = ''; }, { once: true });
  } else {
    body.style.maxHeight = body.scrollHeight + 'px';
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('collapsed')));
  }
}

function switchTab(tabId) {
  const tabs = ['tab-pc','tab-ab','tab-cat-bd','tab-accounts','tab-categories'];
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  const btn = document.querySelectorAll('.tab-btn')[tabs.indexOf(tabId)];
  if (btn) btn.classList.add('active');
}

// ─────────────────────────────────────────────
// Carry-over banner
// ─────────────────────────────────────────────
function updateBanner(carriedItems, carriedIncome) {
  const el    = document.getElementById('carry-banner');
  const parts = [];
  if (carriedItems  > 0) parts.push(`${carriedItems} budget item${carriedItems!==1?'s':''}`);
  if (carriedIncome > 0) parts.push(`${carriedIncome} income entry${carriedIncome!==1?'s':''}`);
  if (parts.length) {
    el.textContent = `↻  ${parts.join(' and ')} carried into ${monthLabel(state.currentMonth)} — review and adjust as needed`;
    el.classList.add('visible');
  } else {
    el.classList.remove('visible');
  }
}

// ─────────────────────────────────────────────
// Full render
// ─────────────────────────────────────────────
function render(carriedItems, carriedIncome) {
  document.getElementById('month-display').textContent = monthLabel(state.currentMonth);
  updateBanner(carriedItems||0, carriedIncome||0);
  renderIncome();
  renderAccounts();
  renderCategories();
  renderItems();
  updateSummaryDisplay();
  renderPaycheckBreakdown();
  renderAccountBreakdown();
  renderCategoryBreakdown();
}

// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────
load();
if (!state.categories || !state.categories.length) {
  state.categories = DEFAULT_CATEGORIES.map(c => ({ ...c, id: uid() }));
}
monthData(state.currentMonth);
localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
render(0, 0);

if (_syncToken) {
  setSyncStatus('idle');
  loadRemote().then(synced => { if (synced) render(0, 0); });
} else {
  setSyncStatus('idle');
  openConnectModal();
}

// ─────────────────────────────────────────────
// Add Item Modal
// ─────────────────────────────────────────────
let _selectedDay = null;

function openAddItemModal() {
  _selectedDay = null;
  document.getElementById('nim-edit-id').value          = '';
  document.getElementById('nim-modal-title').textContent = 'Add Budget Item';
  document.getElementById('nim-confirm-btn').textContent = 'Add Item';
  document.getElementById('nim-month-row').style.display = '';
  document.getElementById('nim-name').value    = '';
  document.getElementById('nim-amount').value  = '';
  document.getElementById('nim-note').value    = '';
  document.getElementById('nim-account').innerHTML = [
    '<option value="">— No account —</option>',
    ...state.accounts.map(a => `<option value="${a.id}">${esc(a.name)}</option>`)
  ].join('');
  document.getElementById('nim-category').innerHTML = [
    '<option value="">— No category —</option>',
    ...state.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`)
  ].join('');
  const nimMonth = document.getElementById('nim-month');
  nimMonth.innerHTML = '';
  const [cy, cm] = state.currentMonth.split('-').map(Number);
  for (let i = 0; i < 7; i++) {
    const d = new Date(cy, cm - 1 + i, 1);
    const ym = d.toISOString().slice(0, 7);
    const opt = document.createElement('option');
    opt.value = ym;
    opt.textContent = monthLabel(ym) + (i === 0 ? ' (current)' : '');
    nimMonth.appendChild(opt);
  }
  _buildCalendar();
  document.getElementById('add-item-modal').classList.add('open');
  setTimeout(() => document.getElementById('nim-name').focus(), 50);
}

function closeAddItemModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('add-item-modal').classList.remove('open');
}

function _buildCalendar() {
  const [year, month] = state.currentMonth.split('-').map(Number);
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  let html = '<div class="cal-grid">';
  ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d => {
    html += `<div class="cal-head">${d}</div>`;
  });
  for (let i = 0; i < firstDow; i++) html += '<div class="cal-cell cal-empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const half = d <= 15 ? 'h1' : 'h2';
    html += `<div class="cal-cell ${half}" id="cal-d-${d}" onclick="_pickDay(${d})">${d}</div>`;
  }
  html += '</div>';
  html += `<div class="cal-legend">
    <span class="cal-leg"><span class="cal-leg-dot" style="background:rgba(249,115,22,0.5)"></span>1st – 15th</span>
    <span class="cal-leg"><span class="cal-leg-dot" style="background:rgba(52,211,153,0.4)"></span>16th – end</span>
  </div>`;
  document.getElementById('nim-cal').innerHTML = html;
}

function _pickDay(d) {
  if (_selectedDay) document.getElementById(`cal-d-${_selectedDay}`)?.classList.remove('selected');
  _selectedDay = d;
  document.getElementById(`cal-d-${d}`)?.classList.add('selected');
}

function openEditItemModal(id) {
  const item = curItems().find(i => i.id === id);
  if (!item) return;
  _selectedDay = item.dueDay ? parseInt(item.dueDay) : null;
  document.getElementById('nim-edit-id').value           = id;
  document.getElementById('nim-modal-title').textContent  = 'Edit Budget Item';
  document.getElementById('nim-confirm-btn').textContent  = 'Save Changes';
  document.getElementById('nim-month-row').style.display  = 'none';
  document.getElementById('nim-name').value    = item.name   || '';
  document.getElementById('nim-amount').value  = item.amount || '';
  document.getElementById('nim-note').value    = item.note   || '';
  document.getElementById('nim-account').innerHTML = [
    '<option value="">— No account —</option>',
    ...state.accounts.map(a => `<option value="${a.id}" ${a.id===item.accountId?'selected':''}>${esc(a.name)}</option>`)
  ].join('');
  document.getElementById('nim-category').innerHTML = [
    '<option value="">— No category —</option>',
    ...state.categories.map(c => `<option value="${c.id}" ${c.id===item.categoryId?'selected':''}>${esc(c.name)}</option>`)
  ].join('');
  _buildCalendar();
  if (_selectedDay) document.getElementById(`cal-d-${_selectedDay}`)?.classList.add('selected');
  document.getElementById('add-item-modal').classList.add('open');
  setTimeout(() => document.getElementById('nim-name').focus(), 50);
}

function confirmAddItem() {
  const editId     = document.getElementById('nim-edit-id').value;
  const name       = document.getElementById('nim-name').value.trim();
  const amount     = document.getElementById('nim-amount').value;
  const accountId  = document.getElementById('nim-account').value;
  const categoryId = document.getElementById('nim-category').value;
  const note       = document.getElementById('nim-note').value.trim();

  if (editId) {
    const item = curItems().find(i => i.id === editId);
    if (item) {
      item.name       = name;
      item.amount     = amount;
      item.accountId  = accountId;
      item.categoryId = categoryId;
      item.note       = note;
      if (_selectedDay) item.dueDay = String(_selectedDay);
    }
  } else {
    const targetMonth = document.getElementById('nim-month').value;
    monthData(targetMonth).items.push({
      id: uid(), name, amount,
      dueDay: _selectedDay ? String(_selectedDay) : '',
      accountId, categoryId, recurring: false, split: false, note
    });
  }
  save();
  renderItems();
  updateSummaryDisplay();
  renderPaycheckBreakdown();
  renderAccountBreakdown();
  renderCategoryBreakdown();
  closeAddItemModal();
}

// ─────────────────────────────────────────────
// Keyboard shortcuts
// ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
      e.preventDefault();
      openAddItemModal();
    }
  }
});
