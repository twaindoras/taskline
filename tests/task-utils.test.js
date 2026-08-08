const test = require('node:test');
const assert = require('node:assert/strict');
const { filterTasks, sortTasks, summarizeTasks, uniqueCategories } = require('../task-utils.js');

function task(overrides = {}) {
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Task',
    done: false,
    priority: 'medium',
    due_date: null,
    category: 'General',
    ...overrides,
  };
}

test('filterTasks: status=all returns everything', () => {
  const tasks = [task({ done: true }), task({ done: false })];
  assert.equal(filterTasks(tasks, { status: 'all' }).length, 2);
});

test('filterTasks: status=active excludes done tasks', () => {
  const tasks = [task({ done: true }), task({ done: false })];
  const result = filterTasks(tasks, { status: 'active' });
  assert.equal(result.length, 1);
  assert.equal(result[0].done, false);
});

test('filterTasks: status=done excludes active tasks', () => {
  const tasks = [task({ done: true }), task({ done: false })];
  const result = filterTasks(tasks, { status: 'done' });
  assert.equal(result.length, 1);
  assert.equal(result[0].done, true);
});

test('filterTasks: filters by category', () => {
  const tasks = [task({ category: 'Work' }), task({ category: 'Home' })];
  const result = filterTasks(tasks, { category: 'Work' });
  assert.equal(result.length, 1);
  assert.equal(result[0].category, 'Work');
});

test('sortTasks: incomplete tasks come before complete ones', () => {
  const tasks = [task({ done: true, title: 'A' }), task({ done: false, title: 'B' })];
  const result = sortTasks(tasks);
  assert.equal(result[0].title, 'B');
  assert.equal(result[1].title, 'A');
});

test('sortTasks: higher priority comes first within same completion state', () => {
  const tasks = [
    task({ priority: 'low', title: 'A' }),
    task({ priority: 'high', title: 'B' }),
    task({ priority: 'medium', title: 'C' }),
  ];
  const result = sortTasks(tasks);
  assert.deepEqual(result.map(t => t.title), ['B', 'C', 'A']);
});

test('sortTasks: earlier due dates come first within same priority', () => {
  const tasks = [
    task({ title: 'Later', due_date: '2026-12-01' }),
    task({ title: 'Sooner', due_date: '2026-01-01' }),
  ];
  const result = sortTasks(tasks);
  assert.deepEqual(result.map(t => t.title), ['Sooner', 'Later']);
});

test('sortTasks: tasks with a due date come before tasks without one', () => {
  const tasks = [
    task({ title: 'No date', due_date: null }),
    task({ title: 'Has date', due_date: '2026-01-01' }),
  ];
  const result = sortTasks(tasks);
  assert.deepEqual(result.map(t => t.title), ['Has date', 'No date']);
});

test('summarizeTasks: counts total, done, active correctly', () => {
  const tasks = [task({ done: true }), task({ done: true }), task({ done: false })];
  const summary = summarizeTasks(tasks);
  assert.equal(summary.total, 3);
  assert.equal(summary.done, 2);
  assert.equal(summary.active, 1);
});

test('summarizeTasks: counts overdue active tasks with a past due date', () => {
  const tasks = [
    task({ done: false, due_date: '2020-01-01' }),
    task({ done: false, due_date: '2099-01-01' }),
    task({ done: true, due_date: '2020-01-01' }), // done tasks never count as overdue
  ];
  const summary = summarizeTasks(tasks);
  assert.equal(summary.overdue, 1);
});

test('uniqueCategories: returns sorted distinct categories', () => {
  const tasks = [task({ category: 'Work' }), task({ category: 'Home' }), task({ category: 'Work' })];
  assert.deepEqual(uniqueCategories(tasks), ['Home', 'Work']);
});

test('uniqueCategories: handles empty list', () => {
  assert.deepEqual(uniqueCategories([]), []);
});
