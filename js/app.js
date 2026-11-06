/*
 * JimmysKanban — 介面
 * 無框架、無外部相依，全部 DOM 由 h() 建立（textContent，無 innerHTML 注入風險）。
 */
(function () {
  'use strict';

  var M = window.JK.model;
  var DB = window.JK.storage;
  var IO = window.JK.io;

  var COLUMN_COLORS = ['#64748b', '#3b82f6', '#0ea5e9', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6'];
  var CARD_COLORS = ['', '#fde68a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#ddd6fe', '#fed7aa', '#e2e8f0'];

  var state = null;
  var undoStack = [];
  var redoStack = [];
  var query = '';

  /* ---------- 小工具 ---------- */

  function $(id) { return document.getElementById(id); }

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'style') Object.keys(v).forEach(function (p) { el.style.setProperty(p, v[p]); });
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function fmt(iso, withYear) {
    if (!iso) return '';
    var d = new Date(iso);
    function p(n) { return String(n).padStart(2, '0'); }
    var s = p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    if (withYear || d.getFullYear() !== new Date().getFullYear()) s = d.getFullYear() + '/' + s;
    return s;
  }

  function fmtFull(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('zh-TW', { hour12: false });
  }

  function lsGet(k, d) { try { var v = localStorage.getItem('jimmyskanban:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem('jimmyskanban:' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  var toastTimer = null;
  function toast(msg, isError) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'toast' + (isError ? ' error' : '');
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, isError ? 5000 : 2500);
  }

  function confirmBox(title, text, okLabel) {
    return new Promise(function (resolve) {
      var d = $('confirmDialog');
      $('confirmTitle').textContent = title;
      $('confirmText').textContent = text;
      $('confirmOk').textContent = okLabel || '確定';
      d.returnValue = '';
      d.addEventListener('close', function onClose() {
        d.removeEventListener('close', onClose);
        resolve(d.returnValue === 'ok');
      });
      d.showModal();
    });
  }

  /* ---------- 狀態變更 ---------- */

  /** 所有修改都走這裡：記錄 undo、存檔、重繪 */
  function commit(fn) {
    var before = JSON.stringify(state);
    var result = fn(state);
    if (JSON.stringify(state) !== before) {
      undoStack.push(before);
      if (undoStack.length > 50) undoStack.shift();
      redoStack = [];
      DB.saveState(state);
      render();
    }
    return result;
  }

  function replaceState(next, pushUndo) {
    if (pushUndo) { undoStack.push(JSON.stringify(state)); redoStack = []; }
    state = next;
    DB.saveState(state);
    applySettings();
    render();
  }

  function undo() {
    if (!undoStack.length) return toast('沒有可復原的動作');
    redoStack.push(JSON.stringify(state));
    state = JSON.parse(undoStack.pop());
    DB.saveState(state); applySettings(); render();
    toast('已復原');
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.stringify(state));
    state = JSON.parse(redoStack.pop());
    DB.saveState(state); applySettings(); render();
    toast('已重做');
  }

  /* ---------- 設定 ---------- */

  function applySettings() {
    var root = document.documentElement;
    if (state.settings.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', state.settings.theme);
    root.style.setProperty('--col-w', state.settings.columnWidth + 'px');
    $('boardTitle').textContent = state.board.title;
    document.title = state.board.title + ' · JimmysKanban';
  }

  /* ---------- 繪製 ---------- */

  function matches(card) {
    if (!query) return true;
    var q = query.toLowerCase();
    return (card.title + '\n' + card.description).toLowerCase().indexOf(q) >= 0;
  }

  function render() {
    var board = $('board');
    var scrollX = board.scrollLeft;
    var colScroll = {};
    board.querySelectorAll('.column').forEach(function (c) {
      var s = c.querySelector('.col-scroll');
      if (s) colScroll[c.dataset.id] = s.scrollTop;
    });

    board.textContent = '';
    state.columns.forEach(function (col) { board.appendChild(renderColumn(col)); });
    board.appendChild(h('button', { class: 'add-column', type: 'button', onclick: function () { openColumnDialog(null); } }, ['＋ 新增欄位']));

    board.scrollLeft = scrollX;
    board.querySelectorAll('.column').forEach(function (c) {
      var s = c.querySelector('.col-scroll');
      if (s && colScroll[c.dataset.id]) s.scrollTop = colScroll[c.dataset.id];
    });
    updateStatus();
  }

  function renderColumn(col) {
    var active = M.activeCards(state, col.id);
    var done = M.doneCards(state, col.id);
    var over = col.wipLimit > 0 && active.length > col.wipLimit;

    var activeArea = h('div', { class: 'area active-area', 'data-area': 'active', 'data-col': col.id });
    active.filter(matches).forEach(function (c) { activeArea.appendChild(renderCard(c)); });
    if (!active.length) activeArea.appendChild(h('div', { class: 'empty-hint', text: '拖曳便條紙到這裡' }));

    var doneArea = h('div', { class: 'area done-area', 'data-area': 'done', 'data-col': col.id });
    done.filter(matches).forEach(function (c) { doneArea.appendChild(renderCard(c)); });
    if (!done.length) doneArea.appendChild(h('div', { class: 'empty-hint', text: '標記「已完成!」或拖到這裡' }));

    var el = h('section', { class: 'column', 'data-id': col.id, style: { '--col-color': col.color } }, [
      h('div', { class: 'column-head', draggable: 'true', title: '拖曳可調整欄位順序' }, [
        h('div', { class: 'column-title' }, [
          h('h2', { text: col.title }),
          col.description ? h('div', { class: 'desc', text: col.description }) : null
        ]),
        h('span', {
          class: 'count' + (over ? ' over' : ''),
          title: col.wipLimit ? '進行中 / 上限' : '進行中數量',
          text: active.length + (col.wipLimit ? ' / ' + col.wipLimit : '')
        }),
        h('button', { class: 'btn ghost small', type: 'button', title: '編輯欄位', 'aria-label': '編輯欄位', onclick: function () { openColumnDialog(col.id); } }, ['⋯'])
      ]),
      h('div', { class: 'col-scroll' }, [
        h('div', { class: 'area-label' }, ['▶ 進行中 ' + active.length]),
        activeArea,
        renderAddCard(col),
        h('div', { class: 'area-label' }, [
          '✔ 已完成 ' + done.length,
          done.length ? h('button', {
            class: 'btn ghost small', type: 'button', title: '刪除此欄所有已完成便條紙',
            onclick: function () {
              confirmBox('清除已完成', '確定刪除「' + col.title + '」的 ' + done.length + ' 張已完成便條紙？（可用 Ctrl+Z 復原）', '刪除').then(function (ok) {
                if (ok) commit(function (s) { M.clearDone(s, col.id); });
              });
            }
          }, ['清除']) : null
        ]),
        doneArea
      ])
    ]);
    bindColumnDrag(el, col);
    return el;
  }

  function renderAddCard(col) {
    var wrap = h('div', { class: 'add-card' });
    function showButton() {
      wrap.textContent = '';
      wrap.appendChild(h('button', { class: 'btn add-card-btn', type: 'button', onclick: showForm }, ['＋ 新增便條紙']));
    }
    function showForm() {
      wrap.textContent = '';
      var ta = h('textarea', { rows: '2', placeholder: '輸入標題，Enter 新增（Shift+Enter 換行，Esc 取消）' });
      function submit() {
        var title = ta.value.trim();
        if (!title) return showButton();
        commit(function (s) { M.addCard(s, col.id, { title: title }); });
        // render() 會重建 DOM，重新打開輸入框方便連續新增
        var again = document.querySelector('.column[data-id="' + col.id + '"] .add-card-btn');
        if (again) again.click();
      }
      ta.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); }
        else if (e.key === 'Escape') showButton();
      });
      wrap.appendChild(h('div', { class: 'add-card-form' }, [
        ta,
        h('div', { class: 'row' }, [
          h('button', { class: 'btn primary small', type: 'button', onclick: submit }, ['新增']),
          h('button', { class: 'btn small', type: 'button', onclick: showButton }, ['取消'])
        ])
      ]));
      ta.focus();
    }
    showButton();
    return wrap;
  }

  function renderCard(card) {
    var stampClass = card.stamp || 'none';
    var stampText = M.STAMP_LABELS[card.stamp] || '';
    var stampTitle = { none: '設定印章（無 → 特重要 → 已完成!）', important: '特重要（點擊改為已完成!）', done: '已完成!（點擊取消）' }[stampClass];

    var el = h('article', {
      class: 'card' + (card.stamp === 'done' ? ' is-done' : ''),
      draggable: 'true', tabindex: '0', 'data-id': card.id,
      title: card.title,
      style: card.color ? { '--card-bg': mix(card.color), '--card-accent': card.color } : null,
      ondblclick: function () { openCardDialog(card.id); },
      onkeydown: function (e) { if (e.key === 'Enter' && e.target === el) openCardDialog(card.id); }
    }, [
      h('h3', { class: 'card-title', text: card.title }),
      card.description ? h('p', { class: 'card-desc', text: card.description }) : null,
      h('div', { class: 'card-meta' }, [
        h('span', { title: '建立時間：' + fmtFull(card.createdAt), text: '建 ' + fmt(card.createdAt) }),
        card.updatedAt !== card.createdAt ? h('span', { title: '最後修改：' + fmtFull(card.updatedAt), text: '改 ' + fmt(card.updatedAt) }) : null,
        card.completedAt ? h('span', { class: 'done-at', title: '完成時間：' + fmtFull(card.completedAt), text: '完 ' + fmt(card.completedAt) }) : null
      ]),
      h('button', {
        class: 'stamp ' + stampClass, type: 'button', title: stampTitle, 'aria-label': stampTitle,
        text: stampText,
        onclick: function (e) {
          e.stopPropagation();
          var c = commit(function (s) { return M.cycleStamp(s, card.id); });
          if (c && c.stamp === 'done') toast('已完成！已移到下方完成區');
        },
        ondblclick: function (e) { e.stopPropagation(); }
      })
    ]);
    el.addEventListener('click', function (e) {
      if (e.detail === 1 && e.target.closest('.card-title')) openCardDialog(card.id);
    });
    bindCardDrag(el, card);
    return el;
  }

  /** 便條紙底色：把顏色和白色混一點，讓深色主題也看得清楚 */
  function mix(hex) {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (document.documentElement.getAttribute('data-theme') !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return dark ? 'color-mix(in srgb, ' + hex + ' 18%, #1e293b)' : 'color-mix(in srgb, ' + hex + ' 55%, #ffffff)';
  }

  function updateStatus() {
    var total = state.cards.length;
    var doneN = state.cards.filter(M.isDone).length;
    var imp = state.cards.filter(function (c) { return c.stamp === 'important'; }).length;
    $('statusText').textContent = state.columns.length + ' 個欄位 · ' + total + ' 張便條紙（進行中 ' + (total - doneN) +
      '、特重要 ' + imp + '、已完成 ' + doneN + '）· 儲存於 ' + (DB.backend() === 'indexeddb' ? '本機 IndexedDB' : '本機 localStorage');
    var last = lsGet('lastBackupAt', null);
    $('lastBackupText').textContent = last ? '上次備份：' + fmtFull(last) : '尚未備份';
  }

  /* ---------- 拖曳 ---------- */

  var dragCardId = null;
  var dragColumnId = null;

  function bindCardDrag(el, card) {
    el.addEventListener('dragstart', function (e) {
      if (e.target !== el) return;
      dragCardId = card.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.title);
      requestAnimationFrame(function () { el.classList.add('dragging'); });
      e.stopPropagation();
    });
    el.addEventListener('dragend', function () {
      dragCardId = null;
      el.classList.remove('dragging');
      clearDropTargets();
    });
  }

  function clearDropTargets() {
    document.querySelectorAll('.drop-target').forEach(function (x) { x.classList.remove('drop-target'); });
  }

  /** 依滑鼠 Y 位置算出插入 index（以完整資料、非搜尋過濾後的列表為準） */
  function dropIndex(area, y) {
    var cards = Array.prototype.slice.call(area.querySelectorAll('.card:not(.dragging)'));
    for (var i = 0; i < cards.length; i++) {
      var r = cards[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        var list = M.activeCards(state, area.dataset.col).filter(function (c) { return c.id !== dragCardId; });
        var idx = list.findIndex(function (c) { return c.id === cards[i].dataset.id; });
        return idx < 0 ? list.length : idx;
      }
    }
    return null; // 放到最後
  }

  function bindBoardDnD() {
    var board = $('board');
    board.addEventListener('dragover', function (e) {
      if (dragCardId) {
        var area = e.target.closest('.area');
        if (!area) {
          var col = e.target.closest('.column');
          if (!col) return;
          area = col.querySelector('.active-area');
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!area.classList.contains('drop-target')) { clearDropTargets(); area.classList.add('drop-target'); }
      } else if (dragColumnId) {
        e.preventDefault();
      }
    });
    board.addEventListener('drop', function (e) {
      if (dragCardId) {
        e.preventDefault();
        var area = e.target.closest('.area');
        if (!area) {
          var colEl = e.target.closest('.column');
          if (!colEl) return;
          area = colEl.querySelector('.active-area');
        }
        var id = dragCardId;
        var target = area.dataset.area;
        var idx = target === 'active' ? dropIndex(area, e.clientY) : null;
        var card = M.findCard(state, id);
        var wasDone = card && M.isDone(card);
        commit(function (s) { M.moveCard(s, id, area.dataset.col, target, idx); });
        if (target === 'done' && !wasDone) toast('已標記為「已完成!」');
        else if (target === 'active' && wasDone) toast('已取消完成，移回進行中');
        clearDropTargets();
      } else if (dragColumnId) {
        e.preventDefault();
        var cols = Array.prototype.slice.call(board.querySelectorAll('.column'));
        var to = cols.length;
        for (var i = 0; i < cols.length; i++) {
          var r = cols[i].getBoundingClientRect();
          if (e.clientX < r.left + r.width / 2) { to = i; break; }
        }
        var from = state.columns.findIndex(function (c) { return c.id === dragColumnId; });
        if (from < to) to--;
        var cid = dragColumnId;
        commit(function (s) { M.moveColumn(s, cid, to); });
      }
    });
    board.addEventListener('dragleave', function (e) {
      if (!board.contains(e.relatedTarget)) clearDropTargets();
    });
  }

  function bindColumnDrag(el, col) {
    var head = el.querySelector('.column-head');
    head.addEventListener('dragstart', function (e) {
      dragColumnId = col.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', col.title);
      e.dataTransfer.setDragImage(el, 20, 20);
      requestAnimationFrame(function () { el.classList.add('dragging'); });
    });
    head.addEventListener('dragend', function () { dragColumnId = null; el.classList.remove('dragging'); });
  }

  /* ---------- 對話框：便條紙 ---------- */

  var editingCardId = null;

  function renderSwatches(container, colors, current, onPick) {
    container.textContent = '';
    colors.forEach(function (c) {
      container.appendChild(h('button', {
        type: 'button', class: 'swatch' + (c ? '' : ' none'), 'aria-pressed': String(c === current),
        title: c || '無', 'aria-label': c || '無顏色', style: c ? { background: c } : null,
        onclick: function () {
          container.querySelectorAll('.swatch').forEach(function (s) { s.setAttribute('aria-pressed', 'false'); });
          this.setAttribute('aria-pressed', 'true');
          onPick(c);
        }
      }));
    });
  }

  var pickedCardColor = '';
  function openCardDialog(id) {
    var card = M.findCard(state, id);
    if (!card) return;
    editingCardId = id;
    var f = $('cardForm');
    f.title.value = card.title;
    f.description.value = card.description;
    f.querySelector('input[name=stamp][value="' + card.stamp + '"]').checked = true;
    pickedCardColor = card.color;
    renderSwatches($('cardColors'), CARD_COLORS, card.color, function (c) { pickedCardColor = c; });
    var col = M.findColumn(state, card.columnId);
    $('cardDialogTitle').textContent = '編輯便條紙 · ' + (col ? col.title : '');
    var dl = $('cardTimes');
    dl.textContent = '';
    [['建立時間', card.createdAt], ['最後修改', card.updatedAt], ['完成時間', card.completedAt]].forEach(function (p) {
      dl.appendChild(h('dt', { text: p[0] }));
      dl.appendChild(h('dd', { text: fmtFull(p[1]) }));
    });
    $('cardDialog').returnValue = '';
    $('cardDialog').showModal();
    f.title.focus();
  }

  function bindCardDialog() {
    var d = $('cardDialog');
    d.addEventListener('close', function () {
      if (d.returnValue !== 'ok' || !editingCardId) return;
      var f = $('cardForm');
      var id = editingCardId;
      var stamp = f.querySelector('input[name=stamp]:checked').value;
      commit(function (s) {
        M.updateCard(s, id, { title: f.title.value.trim(), description: f.description.value, color: pickedCardColor, stamp: stamp });
      });
      editingCardId = null;
    });
    $('btnDeleteCard').addEventListener('click', function () {
      var id = editingCardId;
      d.close('cancel');
      commit(function (s) { M.deleteCard(s, id); });
      toast('已刪除（Ctrl+Z 可復原）');
    });
    // Ctrl+Enter 儲存
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); d.close('ok'); }
    });
  }

  /* ---------- 對話框：欄位 ---------- */

  var editingColumnId = null;
  var pickedColumnColor = COLUMN_COLORS[1];

  function openColumnDialog(id) {
    editingColumnId = id;
    var col = id ? M.findColumn(state, id) : null;
    var f = $('columnForm');
    f.title.value = col ? col.title : '';
    f.description.value = col ? col.description : '';
    f.wipLimit.value = col ? col.wipLimit : 0;
    pickedColumnColor = col ? col.color : COLUMN_COLORS[(state.columns.length + 1) % COLUMN_COLORS.length];
    renderSwatches($('columnColors'), COLUMN_COLORS, pickedColumnColor, function (c) { pickedColumnColor = c; });
    $('columnDialogTitle').textContent = col ? '編輯欄位' : '新增欄位';
    $('btnDeleteColumn').hidden = !col;
    $('columnDialog').returnValue = '';
    $('columnDialog').showModal();
    f.title.focus();
  }

  function bindColumnDialog() {
    var d = $('columnDialog');
    d.addEventListener('close', function () {
      if (d.returnValue !== 'ok') return;
      var f = $('columnForm');
      var data = { title: f.title.value.trim(), description: f.description.value.trim(), wipLimit: f.wipLimit.value, color: pickedColumnColor };
      var id = editingColumnId;
      commit(function (s) { if (id) M.updateColumn(s, id, data); else M.addColumn(s, data); });
      if (!id) setTimeout(function () { var b = $('board'); b.scrollLeft = b.scrollWidth; }, 0);
    });
    $('btnDeleteColumn').addEventListener('click', function () {
      var id = editingColumnId;
      var col = M.findColumn(state, id);
      var n = state.cards.filter(function (c) { return c.columnId === id; }).length;
      d.close('cancel');
      confirmBox('刪除欄位', '確定刪除「' + col.title + '」與其中 ' + n + ' 張便條紙？（Ctrl+Z 可復原）', '刪除').then(function (ok) {
        if (ok) commit(function (s) { M.deleteColumn(s, id); });
      });
    });
  }

  /* ---------- 備份 / 匯出入 ---------- */

  function markBackedUp() {
    lsSet('lastBackupAt', new Date().toISOString());
    $('backupReminder').hidden = true;
    updateStatus();
  }

  function doImport(mode) {
    IO.pickJSON().then(function (data) {
      if (!data) return;
      var next;
      try {
        next = mode === 'merge' ? M.merge(state, data) : M.normalize(data);
      } catch (e) { return toast('匯入失敗：' + e.message, true); }
      var msg = mode === 'merge'
        ? '將合併 ' + next.columns.length + ' 個欄位 / ' + next.cards.length + ' 張便條紙（相同項目以較新的修改時間為準）。'
        : '將以檔案內容（' + next.columns.length + ' 個欄位 / ' + next.cards.length + ' 張便條紙）取代目前看板。';
      return confirmBox(mode === 'merge' ? '匯入（合併）' : '匯入（取代）', msg + '\n匯入前會自動建立快照。', '匯入').then(function (ok) {
        if (!ok) return;
        return DB.addSnapshot(state, 'before-import').then(function () {
          replaceState(next, true);
          toast('匯入完成');
        });
      });
    }).catch(function (e) { toast('匯入失敗：' + e.message, true); });
  }

  var REASONS = { auto: '自動', manual: '手動', 'before-import': '匯入前', 'before-clear': '清空前', 'before-restore': '還原前' };

  function openSnapshots() {
    var list = $('snapList');
    list.textContent = '讀取中…';
    DB.listSnapshots().then(function (snaps) {
      list.textContent = '';
      if (!snaps.length) list.appendChild(h('p', { class: 'hint', text: '目前沒有快照。' }));
      snaps.forEach(function (sn) {
        list.appendChild(h('div', { class: 'snap-item' }, [
          h('div', { class: 'info' }, [
            h('div', { text: fmtFull(sn.at) + '（' + (REASONS[sn.reason] || sn.reason) + '）' }),
            h('div', { class: 'sub', text: sn.columns + ' 個欄位 · ' + sn.cards + ' 張便條紙' })
          ]),
          h('button', {
            class: 'btn small', type: 'button', text: '匯出',
            onclick: function () { IO.exportJSON(sn.state); }
          }),
          h('button', {
            class: 'btn small primary', type: 'button', text: '還原',
            onclick: function () {
              $('snapDialog').close();
              confirmBox('還原快照', '以 ' + fmtFull(sn.at) + ' 的快照取代目前看板？（還原前會先保存目前狀態）', '還原').then(function (ok) {
                if (!ok) return;
                DB.addSnapshot(state, 'before-restore').then(function () {
                  replaceState(M.normalize(sn.state), true);
                  toast('已還原');
                });
              });
            }
          })
        ]));
      });
    });
    $('snapDialog').showModal();
  }

  function handleAction(act) {
    switch (act) {
      case 'export-json':
        IO.exportJSON(state).then(function (ok) { if (ok) { markBackedUp(); toast('備份完成'); } });
        break;
      case 'export-csv': IO.exportCSV(state); break;
      case 'export-md': IO.exportMarkdown(state); break;
      case 'import-replace': doImport('replace'); break;
      case 'import-merge': doImport('merge'); break;
      case 'snapshots': openSnapshots(); break;
      case 'clear':
        confirmBox('清空看板', '確定刪除所有欄位與便條紙？清空前會自動建立快照。', '清空').then(function (ok) {
          if (!ok) return;
          DB.addSnapshot(state, 'before-clear').then(function () {
            commit(function (s) { s.columns = []; s.cards = []; });
            toast('已清空（可從快照還原）');
          });
        });
        break;
    }
  }

  function bindMenu() {
    var btn = $('btnBackup');
    var menu = $('backupMenu');
    function close() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      btn.setAttribute('aria-expanded', String(!menu.hidden));
    });
    document.addEventListener('click', function (e) { if (!menu.contains(e.target)) close(); });
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      close();
      handleAction(b.dataset.act);
    });
  }

  function checkBackupReminder() {
    var days = lsGet('backupReminderDays', 3);
    if (!days || !state.cards.length) return;
    var last = lsGet('lastBackupAt', null);
    var snoozed = lsGet('reminderSnoozedAt', null);
    var ref = Math.max(last ? Date.parse(last) : 0, snoozed ? Date.parse(snoozed) : 0) || Date.parse(state.board.createdAt);
    if (Date.now() - ref > days * 86400000) {
      $('backupReminderText').textContent = last
        ? '距離上次備份已超過 ' + days + ' 天，建議匯出一份備份檔到網路磁碟或雲端資料夾。'
        : '你還沒有備份過！資料只存在這台電腦的瀏覽器裡，建議匯出備份檔。';
      $('backupReminder').hidden = false;
    }
  }

  /* ---------- 設定 / 標題 / 安裝 ---------- */

  function bindSettings() {
    var d = $('settingsDialog');
    var f = $('settingsForm');
    $('btnSettings').addEventListener('click', function () {
      f.theme.value = state.settings.theme;
      f.columnWidth.value = state.settings.columnWidth;
      $('widthOut').textContent = state.settings.columnWidth;
      f.backupReminderDays.value = String(lsGet('backupReminderDays', 3));
      var info = $('storageInfo');
      info.textContent = '儲存方式：' + (DB.backend() === 'indexeddb' ? 'IndexedDB（瀏覽器內建資料庫）' : 'localStorage');
      DB.estimate().then(function (est) {
        if (est && est.usage !== undefined) info.textContent += ' · 已使用約 ' + (est.usage / 1024).toFixed(0) + ' KB';
      });
      if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(function (p) {
        info.textContent += p ? ' · 已啟用持久保存' : ' · 未啟用持久保存（安裝成 App 後較不會被清除）';
      });
      d.showModal();
    });
    f.theme.addEventListener('change', function () { commit(function (s) { s.settings.theme = f.theme.value; }); applySettings(); render(); });
    f.columnWidth.addEventListener('input', function () {
      $('widthOut').textContent = f.columnWidth.value;
      document.documentElement.style.setProperty('--col-w', f.columnWidth.value + 'px');
    });
    f.columnWidth.addEventListener('change', function () {
      var w = parseInt(f.columnWidth.value, 10);
      state.settings.columnWidth = w; DB.saveState(state);
    });
    f.backupReminderDays.addEventListener('change', function () { lsSet('backupReminderDays', parseInt(f.backupReminderDays.value, 10)); });
  }

  function bindTitle() {
    var t = $('boardTitle');
    function start() {
      if (t.isContentEditable) return;
      t.contentEditable = 'true';
      t.focus();
      document.getSelection().selectAllChildren(t);
    }
    function finish(save) {
      if (!t.isContentEditable) return;
      t.contentEditable = 'false';
      var v = t.textContent.trim();
      if (save && v && v !== state.board.title) commit(function (s) { s.board.title = v.slice(0, 80); });
      applySettings();
    }
    t.addEventListener('click', start);
    t.addEventListener('keydown', function (e) {
      if (!t.isContentEditable) { if (e.key === 'Enter') { e.preventDefault(); start(); } return; }
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') finish(false);
    });
    t.addEventListener('blur', function () { finish(true); });
  }

  function bindInstall() {
    var deferred = null;
    var btn = $('btnInstall');
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferred = e;
      btn.hidden = false;
    });
    btn.addEventListener('click', function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; btn.hidden = true; });
    });
    window.addEventListener('appinstalled', function () {
      btn.hidden = true;
      toast('安裝完成！之後可從開始功能表或桌面開啟，離線也能用。');
      DB.requestPersistence();
    });
  }

  function bindKeys() {
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      if (document.querySelector('dialog[open]')) return;
      if ((e.ctrlKey || e.metaKey) && !typing) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (e.key === 'y' || (e.key === 'z' && e.shiftKey) || e.key === 'Z') { e.preventDefault(); redo(); }
        else if (e.key === 's') { e.preventDefault(); handleAction('export-json'); }
      }
      if (e.key === '/' && !typing) { e.preventDefault(); $('search').focus(); }
    });
  }

  /* ---------- 啟動 ---------- */

  function init() {
    DB.loadState().then(function (saved) {
      try { state = saved ? M.normalize(saved) : M.sampleState(); }
      catch (e) { console.error(e); state = M.sampleState(); }
      if (!saved) DB.saveState(state);
      applySettings();
      render();
      bindBoardDnD();
      bindCardDialog();
      bindColumnDialog();
      bindMenu();
      bindSettings();
      bindTitle();
      bindInstall();
      bindKeys();
      $('btnAddColumn').addEventListener('click', function () { openColumnDialog(null); });
      $('search').addEventListener('input', function (e) { query = e.target.value.trim(); render(); });
      $('btnDismissReminder').addEventListener('click', function () {
        lsSet('reminderSnoozedAt', new Date().toISOString());
        $('backupReminder').hidden = true;
      });
      window.addEventListener('pagehide', function () { DB.flush(); });
      document.addEventListener('visibilitychange', function () { if (document.hidden) DB.flush(); });
      DB.requestPersistence();
      checkBackupReminder();
    });
  }

  init();
})();
