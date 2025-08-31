// App script extracted from index.html

// --- DOM REFERENCES ---
const monthlyIncomeInput = document.getElementById('monthly-income');
const addIncomeBtn = document.getElementById('add-income-btn');
const summaryIncomeEl = document.getElementById('summary-income');
const summarySpentEl = document.getElementById('summary-spent');
const summaryRemainingEl = document.getElementById('summary-remaining');
const expenseTableBody = document.getElementById('expense-table-body');
const expenseFormFooter = document.getElementById('expense-form-footer');
const allocationCard = document.getElementById('allocation-card');
const expenseDescInput = document.getElementById('expense-desc');
const expenseCatSelect = document.getElementById('expense-cat');
const expenseAmountInput = document.getElementById('expense-amount');
const addExpenseBtn = document.getElementById('add-expense-btn');
const goalsContainerEl = document.getElementById('goals-container');
const expenseChartCanvas = document.getElementById('expense-chart')?.getContext('2d');
const saveMonthBtn = document.getElementById('save-month-btn');
const monthSelector = document.getElementById('month-selector');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const backToCurrentBtn = document.getElementById('back-to-current-btn');
const accountSelector = document.getElementById('account-selector');
const accountBalanceEl = document.getElementById('account-balance');
const addAccountOpenBtn = document.getElementById('add-account-open');
const accountAddCard = document.getElementById('account-add-card');
const saveAccountBtn = document.getElementById('save-account-btn');
const cancelAccountBtn = document.getElementById('cancel-account-btn');
const newAccountName = document.getElementById('new-account-name');
const newAccountBalance = document.getElementById('new-account-balance');

// --- STATE MANAGEMENT ---
let state = {};
let expenseChart;

const initialState = {
  currentMonth: { monthlyIncome: 0, incomes: [], expenses: [] },
  // Tracks which calendar month this ledger represents (e.g., "2025-8").
  currentMonthKey: null,
  monthlyHistory: [],
  goals: {},
  accounts: [], // {name, balance}
  selectedAccount: null,
  recurringExpenses: [], // {id,name,amount,type,occurrencesLeft,linkedAccount,autoPay,lastPaidMonth}
  ui: { totalHidden: false, incomeHidden: false, spentHidden: false }
};

// ensure an initial in-memory state so handlers can use state.accounts before loadData runs
state = JSON.parse(JSON.stringify(initialState));

// --- HELPERS ---
const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const saveData = () => localStorage.setItem('financeLedgerStateClean', JSON.stringify(state));

const loadData = () => {
  const savedState = JSON.parse(localStorage.getItem('financeLedgerStateClean'));
  state = savedState ? savedState : JSON.parse(JSON.stringify(initialState));
  // normalize older or partial saved states by ensuring required keys exist
  for (const k in initialState) {
    if (state[k] === undefined) {
      state[k] = JSON.parse(JSON.stringify(initialState[k]));
    }
  }
  if (!state.ui) state.ui = { totalHidden: false, incomeHidden: false, spentHidden: false };
  if (typeof state.ui.totalHidden !== 'boolean') state.ui.totalHidden = false;
  if (typeof state.ui.incomeHidden !== 'boolean') state.ui.incomeHidden = false;
  if (typeof state.ui.spentHidden !== 'boolean') state.ui.spentHidden = false;
  if (!state.currentMonthKey || !/^\d{4}-\d{1,2}$/.test(state.currentMonthKey)) {
    state.currentMonthKey = getCurrentMonthKey();
    saveData();
  }
};

// --- UI helpers ---
const showToast = (message, opts = {}) => {
  const { type = 'error', title, timeout = 3000 } = opts;
  const stack = document.getElementById('toast-stack');
  if (!stack) { alert(message); return; }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${title ? `<div class="title">${title}</div>` : ''}<div class="msg">${message}</div>`;
  stack.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transform='translateY(-6px)'; setTimeout(()=> el.remove(), 180); }, timeout);
};

const setInvalid = (el, on = true) => { if (!el) return; el.classList.toggle('input-invalid', !!on); };

const ensureDefaultAccountSelection = () => {
  if (state.accounts && state.accounts.length > 0 && (state.selectedAccount === null || state.selectedAccount === 'none')) {
    state.selectedAccount = 0; saveData();
  }
};

const monthKeyToLabel = (key) => {
  if (!key) return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, (m-1), 1);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
};

const renderMonthSelector = () => {
  if (!monthSelector) return;
  const prevVal = monthSelector.value;
  monthSelector.innerHTML = '';
  const cur = document.createElement('option');
  cur.value = 'current';
  cur.textContent = `Current Month (${monthKeyToLabel(state.currentMonthKey)})`;
  monthSelector.appendChild(cur);
  if (state.monthlyHistory && state.monthlyHistory.length > 0) {
    state.monthlyHistory.forEach((m, idx) => {
      const o = document.createElement('option');
      o.value = String(idx); o.textContent = m.monthName || (`History ${idx+1}`);
      monthSelector.appendChild(o);
    });
  }
  if (prevVal && (prevVal === 'current' || state.monthlyHistory[parseInt(prevVal)])) monthSelector.value = prevVal; else monthSelector.value = 'current';

  if (prevMonthBtn && nextMonthBtn) {
    const sel = monthSelector.value; const maxIdx = (state.monthlyHistory||[]).length - 1;
    if (sel === 'current') { prevMonthBtn.disabled = maxIdx < 0; nextMonthBtn.disabled = true; }
    else { const idx = parseInt(sel); prevMonthBtn.disabled = isNaN(idx) || (idx >= maxIdx); nextMonthBtn.disabled = isNaN(idx); }
  }
};

const renderSummary = (monthlyIncome, expenses) => {
  const income = Number(monthlyIncome) || 0;
  const spent = (expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const total = (state.accounts || []).reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  if (summaryIncomeEl) summaryIncomeEl.textContent = (state.ui && state.ui.incomeHidden) ? '•••••' : formatCurrency(income);
  if (summarySpentEl) summarySpentEl.textContent = (state.ui && state.ui.spentHidden) ? '•••••' : formatCurrency(spent);
  if (summaryRemainingEl) summaryRemainingEl.textContent = (state.ui && state.ui.totalHidden) ? '•••••' : formatCurrency(total);
  if (accountBalanceEl) {
    if (state.accounts && state.selectedAccount !== null && state.accounts[state.selectedAccount]) accountBalanceEl.textContent = `Balance: ${formatCurrency(state.accounts[state.selectedAccount].balance)}`;
    else if (state.accounts && state.accounts.length === 0) accountBalanceEl.textContent = 'Balance: ₹0.00';
  }
};

// Accounts
const addAccount = (name, balance) => {
  if (!state.accounts || !Array.isArray(state.accounts)) state.accounts = [];
  state.accounts.push({ name, balance: Number(balance) });
  state.selectedAccount = state.accounts.length - 1; saveData(); renderAll();
};

const selectAccount = (idx) => {
  const i = Number(idx); if (isNaN(i) || !state.accounts[i]) return; state.selectedAccount = i;
  if (accountSelector) accountSelector.value = String(i); saveData(); renderAll();
};

// Renderers
const renderAll = () => {
  renderMonthSelector();
  const selectedMonth = monthSelector.value; let dataToRender;
  if (selectedMonth === 'current') { dataToRender = state.currentMonth; toggleInputs(false); }
  else { dataToRender = state.monthlyHistory[parseInt(selectedMonth)]; toggleInputs(true); }
  if (!dataToRender) { dataToRender = state.currentMonth; monthSelector.value = 'current'; toggleInputs(false); }
  renderSummary(dataToRender.monthlyIncome, dataToRender.expenses);
  renderExpenseTable(dataToRender.expenses);
  renderGoals(); renderRecurringExpenses(); renderDueDashboard(); renderChart(dataToRender.expenses);
  if (typeof renderAccounts === 'function') renderAccounts();
  if (saveMonthBtn) saveMonthBtn.textContent = `End & Save ${monthKeyToLabel(getLedgerMonthKey())}`;
  const viewBanner = document.getElementById('view-mode-banner'); const viewLabel = document.getElementById('view-mode-label');
  if (viewBanner && viewLabel) {
    if (selectedMonth === 'current') viewBanner.classList.add('hidden');
    else { const idx = parseInt(selectedMonth); const m = state.monthlyHistory[idx]; viewLabel.textContent = (m && m.monthName) ? m.monthName : `History ${idx+1}`; viewBanner.classList.remove('hidden'); }
  }
};

const renderExpenseTable = (expenses) => {
  if (!expenseTableBody) return; expenseTableBody.innerHTML = '';
  const getAcctName = (i) => (state.accounts && state.accounts[i]) ? state.accounts[i].name : '';
  (expenses || []).forEach(exp => {
    const row = document.createElement('tr'); row.className = 'border-t border-gray-800';
    row.innerHTML = `
      <td class="p-3 text-gray-400">${exp.date ? new Date(exp.date).toLocaleString() : new Date().toLocaleString()}</td>
      <td class="p-3">${exp.description || ''}</td>
      <td class="p-3 text-gray-400">${exp.category || ''}</td>
      <td class="p-3 text-gray-400">${getAcctName(exp.account)}</td>
      <td class="p-3 text-right font-medium">${formatCurrency(exp.amount || 0)}</td>
    `;
    expenseTableBody.appendChild(row);
  });
  const lbl = document.getElementById('input-account-label');
  if (lbl) lbl.textContent = (state.selectedAccount !== null && state.accounts[state.selectedAccount]) ? state.accounts[state.selectedAccount].name : '—';
};

const renderGoals = () => {
  goalsContainerEl.innerHTML = '';
  for (const key in state.goals) {
    const goal = state.goals[key];
    const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
    const goalEl = document.createElement('div');
    goalEl.innerHTML = `
      <div>
        <div class="flex justify-between items-center mb-1">
          <span class="font-medium text-sm">${goal.name}</span>
          <span class="text-xs text-gray-400">${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}</span>
        </div>
        <div class="w-full bg-gray-700 rounded-full h-2">
          <div class="bg-indigo-600 h-2 rounded-full" style="width: ${Math.min(progress, 100)}%"></div>
        </div>
        <div class="flex gap-2 mt-2 items-center">
          <input type="number" placeholder="Add amount" class="input-field text-xs p-2 flex-grow" data-goal-key="${key}-input" id="goal-${key}-input" name="goal-${key}-input" aria-label="Add to ${goal.name}">
          <select class="input-field text-xs" data-goal-key="${key}-acct" id="goal-${key}-acct" name="goal-${key}-acct"></select>
          <button class="btn btn-secondary text-xs add-to-goal-btn" data-goal-key="${key}">Add</button>
        </div>
      </div>
    `;
    goalsContainerEl.appendChild(goalEl);
  }
  populateGoalAccountSelectors();
};

const populateGoalAccountSelectors = () => {
  document.querySelectorAll('[data-goal-key$="-acct"]').forEach(sel => {
    const key = sel.getAttribute('data-goal-key').replace('-acct','');
    sel.innerHTML = '';
    const defaultOpt = document.createElement('option'); defaultOpt.value = 'use-selected'; defaultOpt.textContent = '-- Use selected account --'; sel.appendChild(defaultOpt);
    state.accounts.forEach((acct, idx) => { const o = document.createElement('option'); o.value = idx; o.textContent = acct.name; sel.appendChild(o); });
    if (state.goals[key] && state.goals[key].linkedAccount !== null) sel.value = state.goals[key].linkedAccount; else sel.value = 'use-selected';
    sel.addEventListener('change', (e) => { const v = e.target.value; state.goals[key].linkedAccount = v === 'use-selected' ? null : (isNaN(parseInt(v)) ? null : parseInt(v)); saveData(); });
  });
};

const renderChart = (expenses) => {
  if (!expenseChartCanvas || typeof Chart === 'undefined') return;
  const expenseData = (expenses || []).reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
  const labels = Object.keys(expenseData); const data = Object.values(expenseData);
  if (expenseChart) expenseChart.destroy();
  expenseChart = new Chart(expenseChartCanvas, { type: 'doughnut', data: { labels, datasets: [{ data, backgroundColor: ['#4F46E5','#7C3AED','#DB2777','#F97316','#F59E0B','#10B981','#3B82F6','#6366F1'], borderColor: '#1F2937', borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '70%' } });
};

const renderAccounts = () => {
  if (accountSelector) {
    accountSelector.innerHTML = '';
    if (!state.accounts || state.accounts.length === 0) {
      accountSelector.innerHTML = '<option value="none">-- No account --</option>';
      if (accountBalanceEl) accountBalanceEl.textContent = 'Balance: ₹0.00';
    } else {
      ensureDefaultAccountSelection();
      state.accounts.forEach((acct, idx) => { const o = document.createElement('option'); o.value = idx; o.textContent = `${acct.name} — ${formatCurrency(acct.balance)}`; accountSelector.appendChild(o); });
      accountSelector.value = state.selectedAccount; accountSelector.style.color = '#ffffff';
    }
  } else {
    if ((!state.accounts || state.accounts.length === 0) && accountBalanceEl) accountBalanceEl.textContent = 'Balance: ₹0.00';
  }
  const list = document.getElementById('account-list');
  if (list) {
    list.innerHTML = '';
    if (state.accounts && state.accounts.length > 0) {
      state.accounts.forEach((acct, idx) => {
        const b = document.createElement('button'); b.className = 'btn btn-secondary text-xs'; b.textContent = `${acct.name}`; b.setAttribute('data-idx', idx);
        if (String(state.selectedAccount) === String(idx)) b.classList.add('bg-indigo-600');
        b.addEventListener('click', (ev) => { const i = ev.currentTarget.getAttribute('data-idx'); selectAccount(i); });
        list.appendChild(b);
      });
    }
  }
  populateNewGoalAccountSelect();
  populateGoalAccountSelectors();
  populateRecurringAccountSelect();
};

const populateRecurringAccountSelect = () => {
  const sel = document.getElementById('rec-account'); if (!sel) return;
  sel.innerHTML = ''; const none = document.createElement('option'); none.value='none'; none.textContent='-- select account --'; sel.appendChild(none);
  state.accounts.forEach((acct, idx) => { const o=document.createElement('option'); o.value=idx; o.textContent=acct.name; sel.appendChild(o); });
};

const renderRecurringExpenses = () => {
  const list = document.getElementById('recurring-list'); if (!list) return; list.innerHTML = '';
  if (!state.recurringExpenses || state.recurringExpenses.length===0) { list.innerHTML = '<div class="text-sm text-gray-400">No recurring expenses configured.</div>'; return; }
  state.recurringExpenses.forEach((r, idx) => {
    const el = document.createElement('div'); el.className = 'p-3 bg-gray-900 rounded-lg flex justify-between items-center';
    const left = document.createElement('div'); left.innerHTML = `<div class="font-medium">${r.name}</div><div class="text-xs text-gray-400">${r.type} • ${r.occurrencesLeft} months left</div>`;
    const right = document.createElement('div');
    const amountText = r.type==='fixed' ? `${formatCurrency(r.amount)}` : `<input id="rec-input-${idx}" name="rec-input-${idx}" data-rec-idx="${idx}" class="input-field text-xs mr-2" placeholder="Enter amount" aria-label="Enter amount for ${r.name}">`;
    right.innerHTML = `${amountText} <button class="btn btn-secondary btn-mark-paid" data-rec-idx="${idx}">Mark Paid</button> <button class="btn btn-secondary btn-del-rec" data-rec-idx="${idx}">Delete</button>`;
    el.appendChild(left); el.appendChild(right);
    if (r.occurrencesLeft>0 && (!r.lastPaidMonth || r.lastPaidMonth !== getCurrentMonthKey())) {
      const warn = document.createElement('div'); warn.className='text-xs text-yellow-300 ml-2'; warn.textContent='Payment due - please transfer'; left.appendChild(warn);
      const acctIdx = (r.linkedAccount!==null && state.accounts[r.linkedAccount]) ? r.linkedAccount : state.selectedAccount;
      const amtNeeded = r.type==='fixed' ? r.amount : (r.defaultEstimate || 0);
      if (acctIdx!==null && state.accounts[acctIdx] && amtNeeded>0 && state.accounts[acctIdx].balance < amtNeeded) { const badge = document.createElement('div'); badge.className='text-xs text-red-300 ml-2'; badge.textContent='Insufficient balance'; left.appendChild(badge); }
    }
    list.appendChild(el);
  });
};

const getCurrentMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()+1}`; };
const getLedgerMonthKey = () => (state && state.currentMonthKey) ? state.currentMonthKey : getCurrentMonthKey();

const createRecurring = () => {
  const name = document.getElementById('rec-name').value.trim();
  const amount = parseFloat(document.getElementById('rec-amount').value) || 0;
  const type = document.getElementById('rec-type').value;
  const occ = parseInt(document.getElementById('rec-occ').value) || 0;
  const acctVal = document.getElementById('rec-account').value;
  const auto = document.getElementById('rec-auto').checked;
  if (!name || occ<=0) { showToast('Enter a valid name and occurrences (months).', { type:'error', title:'Invalid recurring' }); return; }
  const linked = acctVal==='none' ? null : parseInt(acctVal);
  const interval = parseInt(document.getElementById('rec-interval').value) || 1;
  const defaultEst = parseFloat(document.getElementById('rec-default-est').value) || 0;
  state.recurringExpenses.push({ id: Date.now(), name, amount, type, occurrencesLeft: occ, intervalMonths: interval, defaultEstimate: defaultEst, linkedAccount: linked, autoPay: auto, lastPaidMonth: null, nextDueKey: getLedgerMonthKey() });
  saveData(); renderAll();
};

const processDueRecurringExpenses = () => {
  const monthKey = getLedgerMonthKey();
  state.recurringExpenses.forEach((r) => {
    if (r.occurrencesLeft<=0) return; if (r.lastPaidMonth === monthKey) return; if (!r.autoPay) return;
    const amt = r.type==='fixed' ? r.amount : (r.defaultEstimate || 0); if (amt<=0) return;
    const acctIdx = (r.linkedAccount!==null && state.accounts[r.linkedAccount]) ? r.linkedAccount : state.selectedAccount; if (acctIdx===null || !state.accounts[acctIdx]) return;
    if (state.accounts[acctIdx].balance >= amt) {
      state.accounts[acctIdx].balance -= amt;
      state.currentMonth.expenses.push({ description: `${r.name} (auto)`, category: r.name, amount: amt, account: acctIdx });
      r.occurrencesLeft -= 1; r.lastPaidMonth = monthKey; r.nextDueKey = addMonthsToKey(monthKey, r.intervalMonths);
    }
  });
  saveData(); renderAll();
};

const addMonthsToKey = (key, months) => {
  const [y,m] = key.split('-').map(Number); const total = (y*12 + (m-1)) + months; const ny = Math.floor(total/12); const nm = (total % 12) + 1; return `${ny}-${nm}`;
};

const renderDueDashboard = () => {
  const dashboard = document.getElementById('recurring-card'); if (!dashboard) return;
  const lkey = getLedgerMonthKey();
  const dueThisMonth = state.recurringExpenses.filter(r => r.occurrencesLeft>0 && (r.nextDueKey===lkey || (!r.nextDueKey && (!r.lastPaidMonth || r.lastPaidMonth!==lkey))));
  const banner = document.getElementById('due-banner');
  if (banner) {
    if (dueThisMonth.length>0 && !(state.ui && state.ui.hideDueBanner)) {
      banner.classList.remove('hidden');
      banner.innerHTML = `
        <div class="p-3 bg-yellow-900 rounded text-yellow-100 shadow-lg flex items-start gap-3">
          <div class="flex-1 text-sm">You have ${dueThisMonth.length} recurring payment(s) due. Open the Common / Recurring Expenses panel to mark paid or enable auto-pay.</div>
          <button id="dismiss-due-banner" class="btn btn-secondary px-2 py-1 text-xs">✕</button>
        </div>`;
    } else { banner.classList.add('hidden'); banner.innerHTML=''; }
  }
  renderDueDetails(); renderCalendar(); notifyDueItems(dueThisMonth);
};

const renderDueDetails = () => {
  const el = document.getElementById('due-details'); if (!el) return;
  const lkey = getLedgerMonthKey();
  const dueThisMonth = state.recurringExpenses.filter(r => r.occurrencesLeft>0 && (r.nextDueKey===lkey || (!r.nextDueKey && (!r.lastPaidMonth || r.lastPaidMonth!==lkey))));
  if (dueThisMonth.length===0) { el.textContent='No dues for this month.'; return; }
  el.innerHTML = dueThisMonth.map(r => `${r.name}: ${r.type==='fixed'?formatCurrency(r.amount):(r.defaultEstimate?formatCurrency(r.defaultEstimate):'Enter amount')} • ${r.occurrencesLeft} left`).join('<br>');
};

// EXPORTS
const downloadBlob = (content, filename, mime='application/json') => {
  const blob = new Blob([content], { type: mime }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
};

const exportSelectedMonth = () => {
  let label = 'Current Month'; let data = state.currentMonth; const sel = monthSelector ? monthSelector.value : 'current';
  if (sel !== 'current') { const idx = parseInt(sel); if (!isNaN(idx) && state.monthlyHistory[idx]) { data = state.monthlyHistory[idx]; label = state.monthlyHistory[idx].monthName || `History ${idx+1}`; } }
  else { label = new Date().toLocaleString('default', { month: 'long', year: 'numeric' }); }
  const exportPayload = { exportType: 'month', monthLabel: (sel === 'current') ? monthKeyToLabel(state.currentMonthKey) : label, generatedAt: new Date().toISOString(), summary: { income: Number(data.monthlyIncome) || 0, spent: (data.expenses||[]).reduce((s,e)=> s + (Number(e.amount)||0), 0) }, incomes: (data.incomes||[]).map(i => ({ description: i.description || 'Income', amount: Number(i.amount)||0, date: i.date || null })), expenses: (data.expenses||[]).map(e => ({ description: e.description||'', category: e.category||'', amount: Number(e.amount)||0, date: e.date || null, account: e.account??null })) };
  const labelForFile = (sel === 'current') ? monthKeyToLabel(state.currentMonthKey) : label; const safeLabel = labelForFile.replace(/[^a-z0-9\-\s_]+/gi,'').replace(/\s+/g,'_');
  downloadBlob(JSON.stringify(exportPayload, null, 2), `finance_${safeLabel}.json`);
};

const exportExpenseLedgerCSV = () => {
  let label = 'Current Month'; let data = state.currentMonth; const sel = monthSelector ? monthSelector.value : 'current';
  if (sel !== 'current') { const idx = parseInt(sel); if (!isNaN(idx) && state.monthlyHistory[idx]) { data = state.monthlyHistory[idx]; label = state.monthlyHistory[idx].monthName || `History ${idx+1}`; } } else { label = monthKeyToLabel(state.currentMonthKey); }
  const rows = []; const getAcctName = (i) => (state.accounts && state.accounts[i]) ? state.accounts[i].name : '';
  rows.push(['Date','Description','Category','Amount (₹)','Account']);
  (data.expenses || []).forEach(e => { const dateStr = e.date ? new Date(e.date).toLocaleString() : ''; const desc = e.description || ''; const cat = e.category || ''; const amt = formatCurrency(Number(e.amount) || 0); const acct = getAcctName(e.account); rows.push([dateStr, desc, cat, amt, acct]); });
  const escapeCSV = (val) => { const s = (val ?? '').toString(); if (/[",\n\r]/.test(s)) { return '"' + s.replace(/"/g, '""') + '"'; } return s; };
  const csv = rows.map(r => r.map(escapeCSV).join(',')).join('\r\n');
  const safeLabel = label.replace(/[^a-z0-9\-\s_]+/gi,'').replace(/\s+/g,'_');
  const content = '\uFEFF' + csv; downloadBlob(content, `expense_ledger_${safeLabel}.csv`, 'text/csv;charset=utf-8');
};

const exportToExcel = () => {
  if (typeof XLSX === 'undefined') { showToast('Excel export not available.', { type:'error', title:'Export' }); return; }
  const wb = XLSX.utils.book_new();
  const sanitizeName = (name) => (name || '').toString().replace(/[\\\/*?\[\]:]/g, '').trim();
  const uniqueSheetName = (desired) => { const maxLen = 31; const base = sanitizeName(desired).slice(0, maxLen); let name = base || 'Sheet'; const existing = new Set(wb.SheetNames || []); if (!existing.has(name)) return name; let i = 2; while (true) { const suffix = ` (${i++})`; const cut = Math.max(0, maxLen - suffix.length); const candidate = (base.slice(0, cut) || 'Sheet').slice(0, cut) + suffix; if (!existing.has(candidate)) return candidate; } };
  const aoaAccounts = [['Name','Balance']].concat((state.accounts||[]).map(a=>[a.name, Number(a.balance)||0]));
  const toDateStr = (ts) => ts ? new Date(ts).toLocaleString() : '';
  const getAcctName = (i) => (state.accounts && state.accounts[i]) ? state.accounts[i].name : '';
  const makeIncomeSheet = (label, data) => { const aoa = [['Date','Description','Amount']].concat((data.incomes||[]).map(i=>[toDateStr(i.date), i.description||'Income', Number(i.amount)||0])); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), uniqueSheetName(label)); };
  const makeExpenseSheet = (label, data) => { const aoa = [['Date','Description','Category','Amount','Account']].concat((data.expenses||[]).map(e=>[toDateStr(e.date), e.description||'', e.category||'', Number(e.amount)||0, getAcctName(e.account)])); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), uniqueSheetName(label)); };
  makeExpenseSheet('Current Expenses', state.currentMonth); makeIncomeSheet('Current Incomes', state.currentMonth);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaAccounts), uniqueSheetName('Accounts'));
  (state.monthlyHistory||[]).forEach((m, idx) => { const base = sanitizeName(m.monthName || `History ${idx+1}`); makeIncomeSheet(`${base} Incomes`, m); makeExpenseSheet(`${base} Expenses`, m); });
  const aoaGoals = [['Name','Current','Target','Linked Account']].concat(Object.keys(state.goals||{}).map(k=>{ const g = state.goals[k]; const ln = (g.linkedAccount!==null && state.accounts && state.accounts[g.linkedAccount]) ? state.accounts[g.linkedAccount].name : ''; return [g.name, Number(g.current)||0, Number(g.target)||0, ln]; }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaGoals), uniqueSheetName('Goals'));
  const aoaRec = [['Name','Type','Amount/Estimate','Occurrences Left','Interval (months)','Auto Pay','Linked Account','Last Paid','Next Due']].concat((state.recurringExpenses||[]).map(r=>[ r.name, r.type, r.type==='fixed' ? (Number(r.amount)||0) : (Number(r.defaultEstimate)||0), Number(r.occurrencesLeft)||0, Number(r.intervalMonths)||1, !!r.autoPay, (r.linkedAccount!==null && state.accounts && state.accounts[r.linkedAccount]) ? state.accounts[r.linkedAccount].name : '', r.lastPaidMonth||'', r.nextDueKey||'' ]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaRec), uniqueSheetName('Recurring'));
  const dateTag = new Date().toISOString().slice(0,10); XLSX.writeFile(wb, `finance_export_${dateTag}.xlsx`);
};

const restoreFromBackup = (obj) => {
  try {
    const payload = typeof obj === 'string' ? JSON.parse(obj) : obj; const restored = payload && payload.state ? payload.state : payload; if (!restored || typeof restored !== 'object') throw new Error('Invalid backup format');
    if (!restored.currentMonth || !('monthlyIncome' in restored.currentMonth) || !('expenses' in restored.currentMonth)) { throw new Error('Backup missing required fields'); }
    state = JSON.parse(JSON.stringify(initialState)); state = Object.assign({}, state, restored);
    if (!state.currentMonthKey) state.currentMonthKey = getCurrentMonthKey(); saveData(); renderAll(); showToast('Backup restored successfully.', { type: 'success', title: 'Restore' });
  } catch (e) { console.error(e); showToast('Could not restore backup. Please check the file.', { type:'error', title:'Restore failed' }); }
};

const collectMonthsInRange = (monthsBack) => {
  const list = []; list.push({ key: state.currentMonthKey, label: monthKeyToLabel(state.currentMonthKey), ...state.currentMonth });
  const hist = (state.monthlyHistory||[]).slice().reverse(); hist.forEach((m) => { list.push({ key: null, label: m.monthName || 'History', incomes: m.incomes||[], expenses: m.expenses||[] }); });
  return list.slice(0, monthsBack);
};

const parseRangeKey = (key) => { switch (key) { case '3m': return 3; case '6m': return 6; case '1y': return 12; case '5y': return 60; default: return 12; } };

const exportOverallExpensesExcel = (rangeKey) => {
  if (typeof XLSX === 'undefined') { showToast('Excel export not available.', { type:'error', title:'Export' }); return; }
  const monthsBack = parseRangeKey(rangeKey); const months = collectMonthsInRange(monthsBack); const wb = XLSX.utils.book_new();
  const sanitizeName = (name) => (name || '').toString().replace(/[\\\/*?\[\]:]/g, '').trim();
  const uniqueSheetName = (desired) => { const maxLen = 31; const base = sanitizeName(desired).slice(0, maxLen); let name = base || 'Sheet'; const existing = new Set(wb.SheetNames || []); if (!existing.has(name)) return name; let i = 2; while (true) { const suffix = ` (${i++})`; const cut = Math.max(0, maxLen - suffix.length); const candidate = (base.slice(0, cut) || 'Sheet').slice(0, cut) + suffix; if (!existing.has(candidate)) return candidate; } };
  const toDateStr = (ts) => ts ? new Date(ts).toLocaleString() : ''; const getAcctName = (i) => (state.accounts && state.accounts[i]) ? state.accounts[i].name : '';
  const allRows = [['Month','Date','Description','Category','Amount','Account']];
  months.forEach(m => { (m.expenses||[]).forEach(e => { allRows.push([ m.label, toDateStr(e.date), e.description||'', e.category||'', Number(e.amount)||0, getAcctName(e.account) ]); }); });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(allRows), uniqueSheetName('Overall Expenses'));
  months.forEach(m => { const aoa = [['Date','Description','Category','Amount','Account']].concat((m.expenses||[]).map(e => [toDateStr(e.date), e.description||'', e.category||'', Number(e.amount)||0, getAcctName(e.account)])); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), uniqueSheetName(`${m.label} Expenses`)); });
  const tag = new Date().toISOString().slice(0,10); const fileRange = rangeKey.toUpperCase(); XLSX.writeFile(wb, `overall_expenses_${fileRange}_${tag}.xlsx`);
};

const renderCalendar = () => {
  const container = document.getElementById('calendar-container'); if (!container) return;
  const [yStr, mStr] = getLedgerMonthKey().split('-'); const year = Number(yStr); const month = Number(mStr) - 1;
  const first = new Date(year, month, 1); const startDay = first.getDay(); const daysInMonth = new Date(year, month+1, 0).getDate();
  let html = '<div class="calendar">'; ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=> html += `<div class="text-xs text-gray-400">${d}</div>`);
  for (let i=0;i<startDay;i++) html += `<div></div>`; for (let d=1; d<=daysInMonth; d++) {
    const key = `${year}-${month+1}`; const lkey = getLedgerMonthKey();
    const events = state.recurringExpenses.filter(r => r.occurrencesLeft>0 && (r.nextDueKey===key || (!r.nextDueKey && (!r.lastPaidMonth || r.lastPaidMonth!==lkey))));
    const dayEvents = events.map(r => `<div class="text-yellow-300">${r.name}</div>`).join('');
    html += `<div class="cal-day"><div class="date">${d}</div><div class="events">${dayEvents}</div></div>`;
  }
  html += '</div>'; container.innerHTML = html;
};

const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false; if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') { const p = await Notification.requestPermission(); return p === 'granted'; }
  return false;
};

const notifyDueItems = async (items) => {
  if (!items || items.length===0) return; const allowed = await requestNotificationPermission(); if (!allowed) return;
  const title = `You have ${items.length} due payment(s)`; const body = items.map(i => `${i.name}: ${i.type==='fixed'?formatCurrency(i.amount):(i.defaultEstimate?formatCurrency(i.defaultEstimate):'Enter amount')}`).join('\n');
  new Notification(title, { body });
};

// Event delegation and handlers

document.addEventListener('click', (e) => {
  if (e.target && e.target.classList.contains('btn-mark-paid')) {
    const idx = parseInt(e.target.dataset.recIdx); const rec = state.recurringExpenses[idx]; if (!rec) return;
    let amt = rec.type==='fixed' ? rec.amount : parseFloat(document.querySelector(`[data-rec-idx='${idx}']`).value || 0);
    if (isNaN(amt) || amt<=0) { showToast('Enter a valid amount for variable expense.', { type:'error', title:'Invalid amount' }); return; }
    const acctIdx = (rec.linkedAccount!==null && state.accounts[rec.linkedAccount]) ? rec.linkedAccount : state.selectedAccount;
    if (acctIdx===null || !state.accounts[acctIdx]) { showToast('Select or create an account first.', { type:'warning', title:'No account selected' }); return; }
    if (state.accounts[acctIdx].balance < amt) { showToast('Insufficient balance in the selected account. Cannot mark as paid.', { type:'error', title:'Overdraft blocked' }); return; }
    state.accounts[acctIdx].balance -= amt; state.currentMonth.expenses.push({ description: `${rec.name} (manual)`, category: rec.name, amount: amt, account: acctIdx });
    rec.occurrencesLeft = Math.max(0, rec.occurrencesLeft-1); rec.lastPaidMonth = getLedgerMonthKey(); saveData(); renderAll();
  }
  if (e.target && e.target.classList.contains('btn-del-rec')) { const idx = parseInt(e.target.dataset.recIdx); state.recurringExpenses.splice(idx,1); saveData(); renderAll(); }
  if (e.target && e.target.id === 'dismiss-due-banner') { if (!state.ui) state.ui = { totalHidden:false, incomeHidden:false, spentHidden:false }; state.ui.hideDueBanner = true; saveData(); const banner = document.getElementById('due-banner'); if (banner) { banner.classList.add('hidden'); banner.innerHTML=''; } }
});

const toggleInputs = (disabled) => {
  monthlyIncomeInput.disabled = disabled; addIncomeBtn.disabled = disabled; expenseFormFooter.style.display = disabled ? 'none' : ''; allocationCard.style.display = disabled ? 'none' : '';
  document.querySelectorAll('[data-goal-key-input], .add-to-goal-btn').forEach(el => el.disabled = disabled);
};

const handleAddIncome = () => {
  const amt = parseFloat(monthlyIncomeInput.value); if (isNaN(amt) || amt <= 0) { showToast('Enter a valid income amount.', { type:'error', title:'Invalid income' }); return; }
  if (state.selectedAccount === null || !state.accounts[state.selectedAccount]) { showToast('Please create and select a bank account first.', { type:'warning', title:'No account selected' }); return; }
  state.currentMonth.monthlyIncome += amt; state.currentMonth.incomes.push({ description: 'Income', amount: amt, date: Date.now() });
  state.accounts[state.selectedAccount].balance += amt; saveData(); monthlyIncomeInput.value = ''; processDueRecurringExpenses(); renderAll();
};

const handleAddExpense = (desc, cat, amount) => {
  const descEl = document.getElementById('expense-desc'); const amtEl = document.getElementById('expense-amount');
  const invalidDesc = !desc; const invalidAmt = isNaN(amount) || amount <= 0; setInvalid(descEl, invalidDesc); setInvalid(amtEl, invalidAmt);
  if (invalidDesc || invalidAmt) { showToast('Please enter a valid description and amount.', { type:'error', title:'Invalid expense' }); return; }
  if (state.selectedAccount === null || !state.accounts[state.selectedAccount]) { showToast('Please create and select a bank account first.', { type:'warning', title:'No account selected' }); return; }
  if (state.accounts[state.selectedAccount].balance < amount) { showToast('Insufficient balance in the selected account.', { type:'error', title:'Overdraft blocked' }); return; }
  state.accounts[state.selectedAccount].balance -= amount; state.currentMonth.expenses.push({ description: desc, category: cat, amount: amount, date: Date.now(), account: state.selectedAccount });
  saveData(); renderAll();
};

const handleAllocation = (e) => {
  if (!e.target.classList.contains('allocate-btn')) return; const desc = e.target.dataset.desc; const cat = e.target.dataset.cat; const inputEl = e.target.previousElementSibling; const amount = parseFloat(inputEl.value);
  if (isNaN(amount) || amount <= 0) { showToast('Enter a valid amount.', { type:'error', title:'Invalid amount' }); return; }
  handleAddExpense(desc, cat, amount); inputEl.value = '';
};

const handleAddToGoal = (e) => {
  if (!e.target.classList.contains('add-to-goal-btn')) return; const key = e.target.dataset.goalKey; const inputEl = document.querySelector(`[data-goal-key="${key}-input"]`); const amount = parseFloat(inputEl.value);
  if (isNaN(amount) || amount <= 0) { showToast('Please enter a valid amount to add to the goal.', { type:'error', title:'Invalid amount' }); return; }
  const goalLinked = state.goals[key].linkedAccount; const acctIdx = (goalLinked !== null && state.accounts[goalLinked]) ? goalLinked : state.selectedAccount;
  if (acctIdx === null || !state.accounts[acctIdx]) { showToast('Please create and select a bank account or link one to this goal.', { type:'warning', title:'No account selected' }); return; }
  if (state.accounts[acctIdx].balance < amount) { showToast('Insufficient balance in the selected account.', { type:'error', title:'Overdraft blocked' }); return; }
  state.goals[key].current += amount; state.accounts[acctIdx].balance -= amount; state.currentMonth.expenses.push({ description: `Contribution to ${state.goals[key].name}`, category: 'Savings', amount: amount, account: acctIdx, date: Date.now() });
  inputEl.value = ''; saveData(); renderAll();
};

// Create goal controls
const createGoalBtn = document.getElementById('create-goal-btn');
const newGoalNameInput = document.getElementById('new-goal-name');
const newGoalTargetInput = document.getElementById('new-goal-target');
const newGoalAccountSelect = document.getElementById('new-goal-account');

const populateNewGoalAccountSelect = () => {
  if (!newGoalAccountSelect) return; newGoalAccountSelect.innerHTML = '';
  const noneOpt = document.createElement('option'); noneOpt.value = 'none'; noneOpt.textContent = '-- No linked account --'; newGoalAccountSelect.appendChild(noneOpt);
  state.accounts.forEach((acct, idx) => { const o = document.createElement('option'); o.value = idx; o.textContent = acct.name; newGoalAccountSelect.appendChild(o); });
};

if (createGoalBtn) {
  createGoalBtn.addEventListener('click', () => {
    const name = (newGoalNameInput.value || '').trim(); const target = parseFloat(newGoalTargetInput.value) || 0; const acctVal = newGoalAccountSelect ? newGoalAccountSelect.value : 'none';
    if (!name || target <= 0) { showToast('Enter a valid goal name and target.', { type:'error', title:'Invalid goal' }); return; }
    const keyBase = name.toLowerCase().replace(/[^a-z0-9]+/g,'-'); let key = keyBase; let i = 1; while (state.goals[key]) { key = `${keyBase}-${i++}`; }
    state.goals[key] = { name, current: 0, target, linkedAccount: acctVal === 'none' ? null : parseInt(acctVal) };
    newGoalNameInput.value = ''; newGoalTargetInput.value = ''; saveData(); renderAll();
  });
}

const handleSaveMonth = () => {
  if (state.currentMonth.expenses.length === 0 && state.currentMonth.monthlyIncome === 0) { showToast('Add income or expenses before saving the month.', { type:'error', title:'Nothing to save' }); return; }
  if (confirm('Are you sure you want to end this month? The current data will be saved to history, and you will start with a fresh ledger.')) {
    const monthName = monthKeyToLabel(getLedgerMonthKey()); state.monthlyHistory.push({ ...state.currentMonth, monthName });
    state.currentMonth = JSON.parse(JSON.stringify(initialState.currentMonth)); const nextKey = addMonthsToKey(getLedgerMonthKey(), 1); state.currentMonthKey = nextKey; monthSelector.value = 'current'; saveData(); renderAll();
  }
};

// Account UI
if (addAccountOpenBtn) addAccountOpenBtn.addEventListener('click', () => { if (accountAddCard) accountAddCard.classList.remove('hidden'); });
if (cancelAccountBtn) cancelAccountBtn.addEventListener('click', () => { if (accountAddCard) accountAddCard.classList.add('hidden'); if (newAccountName) newAccountName.value=''; if (newAccountBalance) newAccountBalance.value=''; });
if (saveAccountBtn) saveAccountBtn.addEventListener('click', () => {
  const name = (newAccountName && newAccountName.value.trim()) || `Account ${(state.accounts||[]).length + 1}`; const bal = parseFloat(newAccountBalance ? newAccountBalance.value : 0) || 0;
  addAccount(name, bal); if (newAccountName) newAccountName.value=''; if (newAccountBalance) newAccountBalance.value=''; if (accountAddCard) accountAddCard.classList.add('hidden');
});

if (accountSelector) accountSelector.addEventListener('change', (e) => {
  const val = e.target.value; if (val === 'none') { if (state.accounts && state.accounts.length > 0) { selectAccount(0); } return; }
  const idx = Number(val); selectAccount(idx);
});

// Initialization

document.addEventListener('DOMContentLoaded', () => {
  loadData(); renderAll();
  addIncomeBtn?.addEventListener('click', handleAddIncome);
  addExpenseBtn?.addEventListener('click', () => {
    handleAddExpense(expenseDescInput.value.trim(), expenseCatSelect.value, parseFloat(expenseAmountInput.value)); expenseDescInput.value = ''; expenseAmountInput.value = '';
  });
  expenseDescInput?.addEventListener('input', () => expenseDescInput.classList.remove('input-invalid'));
  expenseAmountInput?.addEventListener('input', () => expenseAmountInput.classList.remove('input-invalid'));
  const createRecBtn = document.getElementById('create-rec-btn'); createRecBtn?.addEventListener('click', createRecurring);
  populateNewGoalAccountSelect();
  document.querySelector('#allocation-card')?.addEventListener('click', handleAllocation);
  goalsContainerEl?.addEventListener('click', handleAddToGoal);
  saveMonthBtn?.addEventListener('click', handleSaveMonth);
  monthSelector?.addEventListener('change', renderAll);
  prevMonthBtn?.addEventListener('click', () => {
    if (!monthSelector) return; const sel = monthSelector.value; const maxIdx = (state.monthlyHistory||[]).length - 1;
    if (sel === 'current') { if (maxIdx >= 0) monthSelector.value = String(maxIdx); }
    else { const idx = parseInt(sel); if (!isNaN(idx)) { const nextIdx = Math.min(maxIdx, idx + 1); monthSelector.value = String(nextIdx); } }
    renderAll();
  });
  nextMonthBtn?.addEventListener('click', () => {
    if (!monthSelector) return; const sel = monthSelector.value; if (sel === 'current') return; const idx = parseInt(sel);
    if (!isNaN(idx)) { const nextIdx = idx - 1; monthSelector.value = nextIdx >= 0 ? String(nextIdx) : 'current'; renderAll(); }
  });
  backToCurrentBtn?.addEventListener('click', () => { if (monthSelector) { monthSelector.value = 'current'; renderAll(); } });
  document.addEventListener('keydown', (e) => { if (e.target && ['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return; if (e.key === 'ArrowLeft' && prevMonthBtn && !prevMonthBtn.disabled) prevMonthBtn.click(); else if (e.key === 'ArrowRight' && nextMonthBtn && !nextMonthBtn.disabled) nextMonthBtn.click(); });
  const overallRangeSelect = document.getElementById('overall-range-select'); const exportOverallBtn = document.getElementById('export-overall-expenses-btn');
  exportOverallBtn?.addEventListener('click', () => { const key = overallRangeSelect ? overallRangeSelect.value : '1y'; exportOverallExpensesExcel(key); });
  const resetBtn = document.getElementById('reset-data-btn');
  resetBtn?.addEventListener('click', () => {
    const warn = 'This will erase all saved data in this browser.\nTo confirm, type the key exactly: DELETE';
    const input = prompt(warn); if (input !== 'DELETE') { showToast('Incorrect key. Data was not deleted.', { type:'error', title:'Reset cancelled' }); return; }
    localStorage.removeItem('financeLedgerStateClean'); state = JSON.parse(JSON.stringify(initialState)); state.currentMonthKey = getCurrentMonthKey(); saveData(); renderAll(); showToast('All data has been deleted from this browser.', { type:'success', title:'Reset complete' });
  });
  const backupBtn = document.getElementById('backup-btn'); const restoreBtn = document.getElementById('restore-btn'); const restoreFile = document.getElementById('restore-file');
  backupBtn?.addEventListener('click', exportFullBackup);
  if (restoreBtn && restoreFile) {
    restoreBtn.addEventListener('click', () => restoreFile.click());
    restoreFile.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => restoreFromBackup(ev.target.result); reader.readAsText(file); e.target.value = '';
    });
  }
  const dlExpenseBtn = document.getElementById('download-expense-ledger-btn'); dlExpenseBtn?.addEventListener('click', exportExpenseLedgerCSV);
  const setupEye = (btnId, hiddenKey, labelBase) => {
    const btn = document.getElementById(btnId); if (!btn) return; const apply = () => { const hidden = !!(state.ui && state.ui[hiddenKey]); btn.setAttribute('aria-pressed', hidden ? 'true' : 'false'); btn.setAttribute('aria-label', `${hidden ? 'Show' : 'Hide'} ${labelBase}`); btn.textContent = hidden ? '🙈' : '👁️'; }; apply();
    btn.addEventListener('click', () => { if (!state.ui) state.ui = { totalHidden: false, incomeHidden: false, spentHidden: false }; state.ui[hiddenKey] = !state.ui[hiddenKey]; saveData(); apply(); renderSummary(state.currentMonth.monthlyIncome, state.currentMonth.expenses); });
  };
  setupEye('toggle-total-visibility', 'totalHidden', 'total');
  setupEye('toggle-income-visibility', 'incomeHidden', 'income');
  setupEye('toggle-spent-visibility', 'spentHidden', 'spent');
  const dueToggle = document.getElementById('toggle-due-toast'); if (dueToggle) { dueToggle.checked = !!(state.ui && state.ui.hideDueBanner); dueToggle.addEventListener('change', () => { if (!state.ui) state.ui = { totalHidden:false, incomeHidden:false, spentHidden:false }; state.ui.hideDueBanner = dueToggle.checked; saveData(); renderDueDashboard(); }); }
});
