/*
 * JimmysKanban — 資料模型（純邏輯，不碰 DOM / 儲存）
 * 可在瀏覽器（window.JK.model）與 Node（module.exports）中使用，方便單元測試。
 *
 * State 結構：
 * {
 *   schema: 1,
 *   board:   { title, createdAt, updatedAt },
 *   columns: [{ id, title, description, color, wipLimit, createdAt, updatedAt }],
 *   cards:   [{ id, columnId, title, description, color, stamp, order,
 *               createdAt, updatedAt, completedAt }],
 *   settings:{ theme: 'light'|'dark'|'auto', columnWidth: number }
 * }
 * stamp: ''（無）| 'important'（特重要）| 'done'（已完成!）
 */
(function (root) {
  'use strict';

  var SCHEMA = 1;
  var STAMPS = ['', 'important', 'done'];
  var STAMP_LABELS = { '': '', important: '特重要', done: '已完成!' };

  function nowISO(now) {
    return (now ? new Date(now) : new Date()).toISOString();
  }

  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function emptyState(now) {
    var t = nowISO(now);
    return {
      schema: SCHEMA,
      board: { title: 'Jimmy 的看板', createdAt: t, updatedAt: t },
      columns: [],
      cards: [],
      settings: { theme: 'auto', columnWidth: 340 }
    };
  }

  function sampleState(now) {
    var s = emptyState(now);
    var todo = addColumn(s, { title: '待辦', color: '#3b82f6' }, now);
    var doing = addColumn(s, { title: '進行中', color: '#f59e0b' }, now);
    addColumn(s, { title: '本週回顧', color: '#10b981' }, now);
    addCard(s, todo.id, { title: '歡迎使用 JimmysKanban！點兩下便條紙可編輯', description: '所有資料都存在這台電腦的瀏覽器資料庫（IndexedDB），不會上傳。' }, now);
    var c2 = addCard(s, todo.id, { title: '點右下角印章可切換：特重要 → 已完成! → 無' }, now);
    setStamp(s, c2.id, 'important', now);
    var c3 = addCard(s, doing.id, { title: '記得定期按「備份」匯出 JSON 檔' }, now);
    setStamp(s, c3.id, 'done', now);
    return s;
  }

  /* ---------- 查詢 ---------- */

  function findColumn(s, id) { return s.columns.find(function (c) { return c.id === id; }) || null; }
  function findCard(s, id) { return s.cards.find(function (c) { return c.id === id; }) || null; }

  function isDone(card) { return card.stamp === 'done'; }

  /** 進行中區：依 order 升冪 */
  function activeCards(s, columnId) {
    return s.cards
      .filter(function (c) { return c.columnId === columnId && !isDone(c); })
      .sort(function (a, b) { return a.order - b.order; });
  }

  /** 完成區：依完成時間降冪（最新完成在最上面） */
  function doneCards(s, columnId) {
    return s.cards
      .filter(function (c) { return c.columnId === columnId && isDone(c); })
      .sort(function (a, b) {
        return String(b.completedAt || '').localeCompare(String(a.completedAt || ''));
      });
  }

  /* ---------- 欄位 ---------- */

  function touchBoard(s, t) { s.board.updatedAt = t; }

  function addColumn(s, data, now) {
    var t = nowISO(now);
    var col = {
      id: uid(),
      title: String((data && data.title) || '新欄位').trim() || '新欄位',
      description: (data && data.description) || '',
      color: (data && data.color) || '#64748b',
      wipLimit: Math.max(0, parseInt(data && data.wipLimit, 10) || 0),
      createdAt: t,
      updatedAt: t
    };
    s.columns.push(col);
    touchBoard(s, t);
    return col;
  }

  function updateColumn(s, id, patch, now) {
    var col = findColumn(s, id);
    if (!col) return null;
    var t = nowISO(now);
    ['title', 'description', 'color'].forEach(function (k) {
      if (patch[k] !== undefined) col[k] = patch[k];
    });
    if (patch.wipLimit !== undefined) col.wipLimit = Math.max(0, parseInt(patch.wipLimit, 10) || 0);
    if (!String(col.title).trim()) col.title = '未命名欄位';
    col.updatedAt = t;
    touchBoard(s, t);
    return col;
  }

  function deleteColumn(s, id, now) {
    var before = s.columns.length;
    s.columns = s.columns.filter(function (c) { return c.id !== id; });
    s.cards = s.cards.filter(function (c) { return c.columnId !== id; });
    if (s.columns.length !== before) touchBoard(s, nowISO(now));
    return s.columns.length !== before;
  }

  /** 將欄位移到 toIndex（0 起算） */
  function moveColumn(s, id, toIndex, now) {
    var from = s.columns.findIndex(function (c) { return c.id === id; });
    if (from < 0) return false;
    var col = s.columns.splice(from, 1)[0];
    toIndex = Math.max(0, Math.min(s.columns.length, toIndex));
    s.columns.splice(toIndex, 0, col);
    touchBoard(s, nowISO(now));
    return true;
  }

  /* ---------- 便條紙 ---------- */

  function nextOrder(s, columnId) {
    var list = activeCards(s, columnId);
    return list.length ? list[list.length - 1].order + 1 : 0;
  }

  function addCard(s, columnId, data, now) {
    if (!findColumn(s, columnId)) return null;
    var t = nowISO(now);
    var card = {
      id: uid(),
      columnId: columnId,
      title: String((data && data.title) || '').trim() || '新便條紙',
      description: (data && data.description) || '',
      color: (data && data.color) || '',
      stamp: '',
      order: nextOrder(s, columnId),
      createdAt: t,
      updatedAt: t,
      completedAt: null
    };
    s.cards.push(card);
    if (data && data.stamp) setStamp(s, card.id, data.stamp, now);
    touchBoard(s, t);
    return card;
  }

  /** 修改內容（title/description/color）；有實際變動才更新 updatedAt */
  function updateCard(s, id, patch, now) {
    var card = findCard(s, id);
    if (!card) return null;
    var t = nowISO(now);
    var changed = false;
    ['title', 'description', 'color'].forEach(function (k) {
      if (patch[k] !== undefined && patch[k] !== card[k]) { card[k] = patch[k]; changed = true; }
    });
    if (!String(card.title).trim()) card.title = '新便條紙';
    if (patch.stamp !== undefined && patch.stamp !== card.stamp) {
      setStamp(s, id, patch.stamp, now);
      changed = true;
    }
    if (changed) { card.updatedAt = t; touchBoard(s, t); }
    return card;
  }

  /**
   * 設定印章。
   * - 設為 done：記錄 completedAt，自動移到完成區（依完成時間排序）
   * - 從 done 改成其他：清除 completedAt，回到進行中區最下方
   */
  function setStamp(s, id, stamp, now) {
    var card = findCard(s, id);
    if (!card) return null;
    if (STAMPS.indexOf(stamp) < 0) stamp = '';
    if (card.stamp === stamp) return card;
    var t = nowISO(now);
    var wasDone = isDone(card);
    if (stamp === 'done') {
      card.stamp = 'done';
      card.completedAt = t;
    } else {
      card.stamp = stamp;
      if (wasDone) {
        card.completedAt = null;
        card.order = nextOrder(s, card.columnId);
      }
    }
    card.updatedAt = t;
    touchBoard(s, t);
    return card;
  }

  /** 印章循環：無 → 特重要 → 已完成! → 無 */
  function cycleStamp(s, id, now) {
    var card = findCard(s, id);
    if (!card) return null;
    var i = STAMPS.indexOf(card.stamp);
    var next = STAMPS[(i + 1) % STAMPS.length];
    return setStamp(s, id, next, now);
  }

  function deleteCard(s, id, now) {
    var before = s.cards.length;
    s.cards = s.cards.filter(function (c) { return c.id !== id; });
    if (s.cards.length !== before) touchBoard(s, nowISO(now));
    return s.cards.length !== before;
  }

  /**
   * 移動便條紙。
   * @param area 'active' | 'done' — 目標區塊。拖進完成區 = 標記已完成；拖出完成區 = 取消完成。
   * @param index 在進行中區的插入位置（完成區依時間排序，index 忽略）
   */
  function moveCard(s, id, toColumnId, area, index, now) {
    var card = findCard(s, id);
    var col = findColumn(s, toColumnId);
    if (!card || !col) return null;
    var t = nowISO(now);
    var columnChanged = card.columnId !== toColumnId;
    card.columnId = toColumnId;

    if (area === 'done') {
      if (!isDone(card)) setStamp(s, id, 'done', now);
    } else {
      if (isDone(card)) {
        card.stamp = '';
        card.completedAt = null;
      }
      var list = activeCards(s, toColumnId).filter(function (c) { return c.id !== id; });
      if (index === undefined || index === null || index < 0 || index > list.length) index = list.length;
      list.splice(index, 0, card);
      list.forEach(function (c, i) { c.order = i; });
    }
    // 跨欄位或狀態改變才算「修改」；同欄位內純排序不更新 updatedAt
    if (columnChanged || area === 'done') card.updatedAt = t;
    touchBoard(s, t);
    return card;
  }

  /** 清空某欄位的完成區 */
  function clearDone(s, columnId, now) {
    var before = s.cards.length;
    s.cards = s.cards.filter(function (c) { return !(c.columnId === columnId && isDone(c)); });
    if (before !== s.cards.length) touchBoard(s, nowISO(now));
    return before - s.cards.length;
  }

  /* ---------- 驗證 / 正規化（匯入時使用） ---------- */

  function isISO(v) { return typeof v === 'string' && !isNaN(Date.parse(v)); }

  /**
   * 將任意輸入轉成合法 state。支援：
   * - 本工具的 JSON（schema 1）
   * - 原版 personal-kanban 的 localStorage 格式：[{ id, title, records:[...] }]
   * 不合法時丟出 Error。
   */
  function normalize(input, now) {
    var t = nowISO(now);
    if (Array.isArray(input)) return fromPersonalKanban(input, now);
    if (!input || typeof input !== 'object' || !Array.isArray(input.columns) || !Array.isArray(input.cards)) {
      throw new Error('檔案格式不正確：找不到 columns / cards');
    }
    var s = emptyState(now);
    if (input.board && typeof input.board === 'object') {
      s.board.title = String(input.board.title || s.board.title);
      s.board.createdAt = isISO(input.board.createdAt) ? input.board.createdAt : t;
      s.board.updatedAt = isISO(input.board.updatedAt) ? input.board.updatedAt : t;
    }
    if (input.settings && typeof input.settings === 'object') {
      if (['light', 'dark', 'auto'].indexOf(input.settings.theme) >= 0) s.settings.theme = input.settings.theme;
      var w = parseInt(input.settings.columnWidth, 10);
      if (w >= 240 && w <= 640) s.settings.columnWidth = w;
    }
    var colIds = {};
    input.columns.forEach(function (c) {
      if (!c || typeof c !== 'object') return;
      var id = c.id ? String(c.id) : uid();
      if (colIds[id]) id = uid();
      colIds[id] = true;
      s.columns.push({
        id: id,
        title: String(c.title || '未命名欄位'),
        description: String(c.description || ''),
        color: String(c.color || '#64748b'),
        wipLimit: Math.max(0, parseInt(c.wipLimit, 10) || 0),
        createdAt: isISO(c.createdAt) ? c.createdAt : t,
        updatedAt: isISO(c.updatedAt) ? c.updatedAt : (isISO(c.createdAt) ? c.createdAt : t)
      });
    });
    var cardIds = {};
    input.cards.forEach(function (c, i) {
      if (!c || typeof c !== 'object' || !colIds[String(c.columnId)]) return;
      var id = c.id ? String(c.id) : uid();
      if (cardIds[id]) id = uid();
      cardIds[id] = true;
      var stamp = STAMPS.indexOf(c.stamp) >= 0 ? c.stamp : '';
      var created = isISO(c.createdAt) ? c.createdAt : t;
      s.cards.push({
        id: id,
        columnId: String(c.columnId),
        title: String(c.title || '新便條紙'),
        description: String(c.description || ''),
        color: String(c.color || ''),
        stamp: stamp,
        order: typeof c.order === 'number' && isFinite(c.order) ? c.order : i,
        createdAt: created,
        updatedAt: isISO(c.updatedAt) ? c.updatedAt : created,
        completedAt: stamp === 'done' ? (isISO(c.completedAt) ? c.completedAt : t) : null
      });
    });
    return s;
  }

  function fromPersonalKanban(columns, now) {
    var t = nowISO(now);
    var s = emptyState(now);
    columns.forEach(function (col) {
      if (!col || typeof col !== 'object') return;
      var created = isISO(col.createdAt) ? col.createdAt : t;
      var c = {
        id: String(col.id || uid()),
        title: String(col.title || '未命名欄位'),
        description: String(col.description || ''),
        color: String(col.color || '#64748b'),
        wipLimit: col.wipEnabled ? Math.max(0, parseInt(col.wipLimit, 10) || 0) : 0,
        createdAt: created,
        updatedAt: created
      };
      s.columns.push(c);
      (col.records || []).forEach(function (r, i) {
        var rc = isISO(r.createdAt) ? r.createdAt : t;
        s.cards.push({
          id: String(r.id || uid()), columnId: c.id,
          title: String(r.title || '新便條紙'), description: String(r.description || ''),
          color: '', stamp: '', order: i,
          createdAt: rc, updatedAt: rc, completedAt: null
        });
      });
    });
    return s;
  }

  /**
   * 合併匯入：以 id 為鍵，較新的 updatedAt 勝出；新欄位附加在後面。
   */
  function merge(current, incoming, now) {
    var inc = normalize(incoming, now);
    var out = normalize(JSON.parse(JSON.stringify(current)), now);
    inc.columns.forEach(function (c) {
      var ex = findColumn(out, c.id);
      if (!ex) out.columns.push(c);
      else if (String(c.updatedAt) > String(ex.updatedAt)) Object.assign(ex, c);
    });
    inc.cards.forEach(function (c) {
      var ex = findCard(out, c.id);
      if (!ex) out.cards.push(c);
      else if (String(c.updatedAt) > String(ex.updatedAt)) Object.assign(ex, c);
    });
    touchBoard(out, nowISO(now));
    return out;
  }

  /* ---------- 匯出 ---------- */

  function csvCell(v) {
    var s = v === null || v === undefined ? '' : String(v);
    if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  /** CSV（含 BOM，Excel 開啟中文不亂碼） */
  function toCSV(s) {
    var header = ['欄位', '區塊', '標題', '內容', '印章', '建立時間', '最後修改時間', '完成時間'];
    var rows = [header];
    s.columns.forEach(function (col) {
      activeCards(s, col.id).concat(doneCards(s, col.id)).forEach(function (c) {
        rows.push([
          col.title, isDone(c) ? '已完成' : '進行中', c.title, c.description,
          STAMP_LABELS[c.stamp] || '', c.createdAt, c.updatedAt, c.completedAt || ''
        ]);
      });
    });
    return '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
  }

  /** Markdown（方便貼到週報 / Teams / Email） */
  function toMarkdown(s) {
    var out = ['# ' + s.board.title, ''];
    s.columns.forEach(function (col) {
      out.push('## ' + col.title, '');
      activeCards(s, col.id).forEach(function (c) {
        out.push('- [ ] ' + (c.stamp === 'important' ? '**[特重要]** ' : '') + c.title);
      });
      doneCards(s, col.id).forEach(function (c) {
        out.push('- [x] ' + c.title + '（完成：' + (c.completedAt || '').slice(0, 10) + '）');
      });
      out.push('');
    });
    return out.join('\n');
  }

  var api = {
    SCHEMA: SCHEMA, STAMPS: STAMPS, STAMP_LABELS: STAMP_LABELS,
    uid: uid, emptyState: emptyState, sampleState: sampleState,
    findColumn: findColumn, findCard: findCard, isDone: isDone,
    activeCards: activeCards, doneCards: doneCards,
    addColumn: addColumn, updateColumn: updateColumn, deleteColumn: deleteColumn, moveColumn: moveColumn,
    addCard: addCard, updateCard: updateCard, setStamp: setStamp, cycleStamp: cycleStamp,
    deleteCard: deleteCard, moveCard: moveCard, clearDone: clearDone,
    normalize: normalize, merge: merge, toCSV: toCSV, toMarkdown: toMarkdown
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JK = root.JK || {};
  root.JK.model = api;
})(typeof window !== 'undefined' ? window : globalThis);
