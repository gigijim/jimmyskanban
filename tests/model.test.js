'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/model.js');

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-02T00:00:00.000Z';
const T2 = '2026-01-03T00:00:00.000Z';
const T3 = '2026-01-04T00:00:00.000Z';

function board() {
  const s = M.emptyState(T0);
  const a = M.addColumn(s, { title: 'A' }, T0);
  const b = M.addColumn(s, { title: 'B' }, T0);
  return { s, a, b };
}

test('emptyState / sampleState shape', () => {
  const s = M.emptyState(T0);
  assert.equal(s.schema, 1);
  assert.deepEqual(s.columns, []);
  const sample = M.sampleState(T0);
  assert.ok(sample.columns.length >= 2 && sample.cards.length >= 2);
  assert.ok(sample.cards.some((c) => c.stamp === 'done' && c.completedAt));
});

test('columns: add / update / move / delete removes cards', () => {
  const { s, a, b } = board();
  M.addCard(s, a.id, { title: 'x' }, T0);
  M.updateColumn(s, a.id, { title: 'AA', wipLimit: '3' }, T1);
  assert.equal(a.title, 'AA');
  assert.equal(a.wipLimit, 3);
  assert.equal(a.updatedAt, T1);
  M.moveColumn(s, b.id, 0, T1);
  assert.deepEqual(s.columns.map((c) => c.title), ['B', 'AA']);
  M.deleteColumn(s, a.id, T2);
  assert.equal(s.columns.length, 1);
  assert.equal(s.cards.length, 0);
});

test('addCard has created/updated time and null completedAt', () => {
  const { s, a } = board();
  const c = M.addCard(s, a.id, { title: '  hello  ' }, T0);
  assert.equal(c.title, 'hello');
  assert.equal(c.createdAt, T0);
  assert.equal(c.updatedAt, T0);
  assert.equal(c.completedAt, null);
  assert.equal(M.addCard(s, 'nope', { title: 'z' }, T0), null);
});

test('updateCard bumps updatedAt only on real change', () => {
  const { s, a } = board();
  const c = M.addCard(s, a.id, { title: 't' }, T0);
  M.updateCard(s, c.id, { title: 't' }, T1);
  assert.equal(c.updatedAt, T0);
  M.updateCard(s, c.id, { title: 't2' }, T2);
  assert.equal(c.updatedAt, T2);
  assert.equal(c.createdAt, T0);
});

test('setStamp done -> moves to done area with completedAt; doneCards sorted DESC', () => {
  const { s, a } = board();
  const c1 = M.addCard(s, a.id, { title: '1' }, T0);
  const c2 = M.addCard(s, a.id, { title: '2' }, T0);
  M.addCard(s, a.id, { title: '3' }, T0);
  M.setStamp(s, c1.id, 'done', T1);
  M.setStamp(s, c2.id, 'done', T2);
  assert.equal(c1.completedAt, T1);
  assert.deepEqual(M.activeCards(s, a.id).map((c) => c.title), ['3']);
  assert.deepEqual(M.doneCards(s, a.id).map((c) => c.title), ['2', '1']);
});

test('un-done clears completedAt and goes to END of active', () => {
  const { s, a } = board();
  const c1 = M.addCard(s, a.id, { title: '1' }, T0);
  M.addCard(s, a.id, { title: '2' }, T0);
  M.setStamp(s, c1.id, 'done', T1);
  M.setStamp(s, c1.id, 'important', T2);
  assert.equal(c1.completedAt, null);
  assert.equal(c1.updatedAt, T2);
  assert.deepEqual(M.activeCards(s, a.id).map((c) => c.title), ['2', '1']);
});

test("cycleStamp: '' -> important -> done -> ''", () => {
  const { s, a } = board();
  const c = M.addCard(s, a.id, { title: 'c' }, T0);
  assert.equal(M.cycleStamp(s, c.id, T1).stamp, 'important');
  assert.equal(M.cycleStamp(s, c.id, T2).stamp, 'done');
  assert.equal(c.completedAt, T2);
  assert.equal(M.cycleStamp(s, c.id, T3).stamp, '');
  assert.equal(c.completedAt, null);
});

test('moveCard into done area marks done; out of done at index clears it', () => {
  const { s, a, b } = board();
  const c = M.addCard(s, a.id, { title: 'c' }, T0);
  M.addCard(s, b.id, { title: 'b1' }, T0);
  M.addCard(s, b.id, { title: 'b2' }, T0);
  M.moveCard(s, c.id, a.id, 'done', null, T1);
  assert.equal(c.stamp, 'done');
  assert.equal(c.completedAt, T1);
  M.moveCard(s, c.id, b.id, 'active', 1, T2);
  assert.equal(c.stamp, '');
  assert.equal(c.completedAt, null);
  assert.deepEqual(M.activeCards(s, b.id).map((x) => x.title), ['b1', 'c', 'b2']);
});

test('same-column reorder keeps updatedAt; cross-column updates it', () => {
  const { s, a, b } = board();
  const c1 = M.addCard(s, a.id, { title: '1' }, T0);
  M.addCard(s, a.id, { title: '2' }, T0);
  M.moveCard(s, c1.id, a.id, 'active', 1, T1);
  assert.deepEqual(M.activeCards(s, a.id).map((x) => x.title), ['2', '1']);
  assert.equal(c1.updatedAt, T0);
  M.moveCard(s, c1.id, b.id, 'active', 0, T2);
  assert.equal(c1.updatedAt, T2);
});

test('clearDone removes only done cards of that column', () => {
  const { s, a, b } = board();
  const c1 = M.addCard(s, a.id, { title: '1' }, T0);
  M.addCard(s, a.id, { title: '2' }, T0);
  const c3 = M.addCard(s, b.id, { title: '3' }, T0);
  M.setStamp(s, c1.id, 'done', T1);
  M.setStamp(s, c3.id, 'done', T1);
  assert.equal(M.clearDone(s, a.id, T2), 1);
  assert.equal(s.cards.length, 2);
});

test('normalize: rejects garbage, cleans own format, dedupes ids', () => {
  assert.throws(() => M.normalize(null));
  assert.throws(() => M.normalize({ foo: 1 }));
  const s = M.normalize({
    columns: [{ id: 'c1', title: 'X' }, { id: 'c1', title: 'dup' }],
    cards: [
      { id: 'k1', columnId: 'c1', title: 'ok', stamp: 'done' },
      { id: 'k1', columnId: 'c1', title: 'dup id' },
      { id: 'k2', columnId: 'missing', title: 'orphan' },
      { id: 'k3', columnId: 'c1', title: 'bad stamp', stamp: 'weird' }
    ]
  }, T0);
  assert.equal(s.columns.length, 2);
  assert.notEqual(s.columns[0].id, s.columns[1].id);
  assert.equal(s.cards.length, 3);
  assert.equal(new Set(s.cards.map((c) => c.id)).size, 3);
  assert.equal(s.cards[0].completedAt, T0);
  assert.equal(s.cards[2].stamp, '');
});

test('normalize: converts original personal-kanban format', () => {
  const s = M.normalize([
    { id: 'p1', title: 'Todo', wipEnabled: true, wipLimit: 5, records: [
      { id: 'r1', title: 'R1', description: 'd', createdAt: T1 }
    ] },
    { id: 'p2', title: 'Done', wipEnabled: false, wipLimit: 9, records: [] }
  ], T0);
  assert.equal(s.columns.length, 2);
  assert.equal(s.columns[0].wipLimit, 5);
  assert.equal(s.columns[1].wipLimit, 0);
  assert.equal(s.cards[0].createdAt, T1);
  assert.equal(s.cards[0].columnId, 'p1');
});

test('merge: newer updatedAt wins, new items appended', () => {
  const { s, a } = board();
  const c = M.addCard(s, a.id, { title: 'old' }, T0);
  const incoming = JSON.parse(JSON.stringify(s));
  incoming.cards[0].title = 'new';
  incoming.cards[0].updatedAt = T2;
  incoming.columns.push({ id: 'z', title: 'Z' });
  incoming.cards.push({ id: 'n', columnId: 'z', title: 'brand new' });
  const out = M.merge(s, incoming, T3);
  assert.equal(out.cards.find((x) => x.id === c.id).title, 'new');
  assert.ok(out.columns.find((x) => x.id === 'z'));
  assert.ok(out.cards.find((x) => x.id === 'n'));
  // older incoming does not overwrite
  const older = JSON.parse(JSON.stringify(out));
  older.cards[0].title = 'stale';
  older.cards[0].updatedAt = T0;
  assert.equal(M.merge(out, older, T3).cards[0].title, 'new');
});

test('toCSV has BOM and escapes; toMarkdown marks done', () => {
  const { s, a } = board();
  M.addCard(s, a.id, { title: 'a, "b"\nc' }, T0);
  const d = M.addCard(s, a.id, { title: 'finished' }, T0);
  M.setStamp(s, d.id, 'done', T1);
  const csv = M.toCSV(s);
  assert.equal(csv[0], '﻿');
  assert.ok(csv.includes('"a, ""b""\nc"'));
  assert.ok(M.toMarkdown(s).includes('- [x] finished'));
});
