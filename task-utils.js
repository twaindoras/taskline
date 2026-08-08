/* ================================================================
   task-utils.js
   Pure functions for filtering, sorting, and summarizing tasks.
   No DOM, no network — kept separate from app.js so it's easy
   to unit test.
   ================================================================ */

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

/**
 * @param {Array<{id:string,title:string,done:boolean,priority:string,due_date:string|null,category:string}>} tasks
 * @param {{status?: 'all'|'active'|'done', category?: string}} filters
 */
function filterTasks(tasks, filters = {}) {
  const { status = 'all', category = 'all' } = filters;
  return tasks.filter(t => {
    if (status === 'active' && t.done) return false;
    if (status === 'done' && !t.done) return false;
    if (category !== 'all' && t.category !== category) return false;
    return true;
  });
}

/**
 * Sorts tasks: incomplete before complete, then by priority (high first),
 * then by due date (soonest first, nulls last).
 */
function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;

    const pa = PRIORITY_ORDER[a.priority] ?? 3;
    const pb = PRIORITY_ORDER[b.priority] ?? 3;
    if (pa !== pb) return pa - pb;

    if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });
}

/**
 * @returns {{total:number, done:number, active:number, overdue:number}}
 */
function summarizeTasks(tasks) {
  const now = new Date();
  let done = 0;
  let overdue = 0;
  for (const t of tasks) {
    if (t.done) done++;
    else if (t.due_date && new Date(t.due_date) < now) overdue++;
  }
  return { total: tasks.length, done, active: tasks.length - done, overdue };
}

/**
 * Returns the sorted list of distinct categories present in the tasks.
 */
function uniqueCategories(tasks) {
  return [...new Set(tasks.map(t => t.category).filter(Boolean))].sort();
}

if (typeof window !== 'undefined') {
  window.TaskUtils = { filterTasks, sortTasks, summarizeTasks, uniqueCategories };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { filterTasks, sortTasks, summarizeTasks, uniqueCategories };
}
