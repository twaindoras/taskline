/* ================================================================
   app.js — Taskline
   Real Supabase-backed auth and task CRUD. Rendering logic calls
   into task-utils.js (filterTasks/sortTasks/summarizeTasks) so the
   actual data transformations stay unit-testable and separate
   from DOM code.
   ================================================================ */

let client = null;
try {
  client = window.supabase.createClient(window.__env.SUPABASE_URL, window.__env.SUPABASE_ANON_KEY);
} catch (e) {
  console.warn('Supabase failed to initialize:', e);
}

let currentUser = null;
let allTasks = [];
let filters = { status: 'all', category: 'all' };

/* ---------- Auth ---------- */

async function getSession() {
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session;
}

async function signUp(email, password) {
  if (!client) { showToast('Auth not ready — check your connection and reload.', 'error'); return false; }
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) { showToast(error.message, 'error'); return false; }
  if (data.user?.identities?.length === 0) {
    showToast('Email already registered — try signing in instead.', 'error');
    return false;
  }
  showToast('Account created! Check your email to confirm, then sign in.');
  return true;
}

async function signIn(email, password) {
  if (!client) { showToast('Auth not ready — check your connection and reload.', 'error'); return false; }
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) { showToast(error.message, 'error'); return false; }
  return true;
}

async function signOut() {
  if (!client) return;
  await client.auth.signOut();
}

/* ---------- Task CRUD ---------- */

async function fetchTasks() {
  if (!currentUser || !client) return [];
  const { data, error } = await client
    .from('tasks')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchTasks failed:', error); return []; }
  return data;
}

async function createTask({ title, category, priority, due_date }) {
  if (!currentUser || !client) return false;
  const { error } = await client.from('tasks').insert({
    user_id: currentUser.id,
    title: title.trim(),
    category: category.trim() || 'General',
    priority,
    due_date: due_date || null,
    done: false,
  });
  if (error) { showToast('Could not add task: ' + error.message, 'error'); return false; }
  return true;
}

async function toggleTaskDone(id, done) {
  if (!client) return false;
  const { error } = await client.from('tasks').update({ done }).eq('id', id).eq('user_id', currentUser.id);
  if (error) { showToast('Could not update task: ' + error.message, 'error'); return false; }
  return true;
}

async function deleteTask(id) {
  if (!client) return false;
  const { error } = await client.from('tasks').delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) { showToast('Could not delete task: ' + error.message, 'error'); return false; }
  return true;
}

/* ---------- Rendering ---------- */

function fmtDate(d) {
  if (!d) return null;
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isOverdue(t) {
  if (t.done || !t.due_date) return false;
  return new Date(t.due_date + 'T00:00:00') < new Date(new Date().toDateString());
}

function renderSummary() {
  const s = window.TaskUtils.summarizeTasks(allTasks);
  document.getElementById('summaryRow').innerHTML = `
    <div class="summary-item"><div class="summary-num">${s.total}</div><div class="summary-label">Total</div></div>
    <div class="summary-item"><div class="summary-num">${s.active}</div><div class="summary-label">Active</div></div>
    <div class="summary-item"><div class="summary-num">${s.done}</div><div class="summary-label">Done</div></div>
    <div class="summary-item"><div class="summary-num overdue">${s.overdue}</div><div class="summary-label">Overdue</div></div>
  `;
}

function renderCategoryOptions() {
  const cats = window.TaskUtils.uniqueCategories(allTasks);
  const filterSelect = document.getElementById('categoryFilter');
  const current = filterSelect.value || 'all';
  filterSelect.innerHTML = '<option value="all">All categories</option>' +
    cats.map(c => `<option value="${c}">${c}</option>`).join('');
  filterSelect.value = cats.includes(current) ? current : 'all';

  document.getElementById('categoryList').innerHTML = cats.map(c => `<option value="${c}">`).join('');
}

function renderTaskList() {
  const filtered = window.TaskUtils.filterTasks(allTasks, filters);
  const sorted = window.TaskUtils.sortTasks(filtered);
  const listEl = document.getElementById('taskList');
  const emptyEl = document.getElementById('emptyMsg');

  if (sorted.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  listEl.innerHTML = sorted.map(t => {
    const overdue = isOverdue(t);
    const dueLabel = fmtDate(t.due_date);
    return `
      <li class="task-item ${t.done ? 'done' : ''}">
        <button class="task-check ${t.done ? 'done' : ''}" data-id="${t.id}" data-done="${t.done}" aria-label="Toggle done">${t.done ? '✓' : ''}</button>
        <div class="task-body">
          <div class="task-title">${escapeHtml(t.title)}</div>
          <div class="task-meta">
            <span class="tag">${escapeHtml(t.category)}</span>
            <span class="tag priority-${t.priority}">${t.priority}</span>
            ${dueLabel ? `<span class="tag ${overdue ? 'overdue' : ''}">${overdue ? 'overdue · ' : 'due '}${dueLabel}</span>` : ''}
          </div>
        </div>
        <button class="task-delete" data-id="${t.id}" aria-label="Delete task">✕</button>
      </li>
    `;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderAll() {
  renderSummary();
  renderCategoryOptions();
  renderTaskList();
}

/* ---------- Auth-state UI switching ---------- */

async function refreshAuthUI() {
  const session = await getSession();
  currentUser = session?.user || null;

  document.getElementById('authArea').style.display = currentUser ? 'none' : 'flex';
  document.getElementById('userArea').style.display = currentUser ? 'flex' : 'none';
  document.getElementById('signedOut').style.display = currentUser ? 'none' : 'block';
  document.getElementById('signedIn').style.display = currentUser ? 'block' : 'none';

  if (currentUser) {
    document.getElementById('userEmail').textContent = currentUser.email;
    allTasks = await fetchTasks();
    renderAll();
  }
}

/* ---------- Toast ---------- */

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', type === 'error');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

/* ---------- Simple prompt-based auth (no modal system needed) ---------- */

function promptAuth(mode) {
  const email = window.prompt(`Email:`);
  if (!email) return;
  const password = window.prompt(`Password (min 6 characters):`);
  if (!password) return;

  (mode === 'signup' ? signUp(email, password) : signIn(email, password))
    .then(ok => { if (ok) refreshAuthUI(); });
}

/* ---------- Event wiring ---------- */

document.getElementById('signInBtn').addEventListener('click', () => promptAuth('signin'));
document.getElementById('signUpBtn').addEventListener('click', () => promptAuth('signup'));
document.getElementById('ctaSignUp').addEventListener('click', () => promptAuth('signup'));
document.getElementById('signOutBtn').addEventListener('click', () => signOut().then(refreshAuthUI));

document.getElementById('taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('taskTitle').value;
  const category = document.getElementById('taskCategory').value;
  const priority = document.getElementById('taskPriority').value;
  const due_date = document.getElementById('taskDue').value;
  if (!title.trim()) return;

  const ok = await createTask({ title, category, priority, due_date });
  if (ok) {
    document.getElementById('taskForm').reset();
    document.getElementById('taskPriority').value = 'medium';
    allTasks = await fetchTasks();
    renderAll();
    showToast('Task added.');
  }
});

document.getElementById('taskList').addEventListener('click', async (e) => {
  const checkBtn = e.target.closest('.task-check');
  const delBtn = e.target.closest('.task-delete');

  if (checkBtn) {
    const id = checkBtn.dataset.id;
    const wasDone = checkBtn.dataset.done === 'true';
    const ok = await toggleTaskDone(id, !wasDone);
    if (ok) { allTasks = await fetchTasks(); renderAll(); }
  }

  if (delBtn) {
    const id = delBtn.dataset.id;
    const ok = await deleteTask(id);
    if (ok) { allTasks = await fetchTasks(); renderAll(); showToast('Task deleted.'); }
  }
});

document.getElementById('statusFilter').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  document.querySelectorAll('#statusFilter .seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filters.status = btn.dataset.value;
  renderTaskList();
});

document.getElementById('categoryFilter').addEventListener('change', (e) => {
  filters.category = e.target.value;
  renderTaskList();
});

if (client) {
  client.auth.onAuthStateChange(() => { refreshAuthUI(); });
}
document.addEventListener('DOMContentLoaded', refreshAuthUI);
