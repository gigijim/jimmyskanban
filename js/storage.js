/*
 * JimmysKanban — 本機資料庫
 * 單純化設計：IndexedDB 只有一個 object store「kv」，
 *   kv['state']      = 整個看板（一份 JSON 文件）
 *   kv['snapshots']  = 自動快照陣列（最多 MAX_SNAPSHOTS 份，用來救援誤刪）
 * IndexedDB 不可用時（例如某些瀏覽器的 file:// 或隱私模式）自動退回 localStorage。
 */
(function (root) {
  'use strict';

  var DB_NAME = 'jimmyskanban';
  var STORE = 'kv';
  var LS_PREFIX = 'jimmyskanban:';
  var MAX_SNAPSHOTS = 20;
  var SNAPSHOT_INTERVAL_MS = 30 * 60 * 1000; // 每 30 分鐘最多一份自動快照

  var dbPromise = null;
  var backend = 'indexeddb';

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!root.indexedDB) return reject(new Error('no indexedDB'));
      var req;
      try { req = root.indexedDB.open(DB_NAME, 1); } catch (e) { return reject(e); }
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
      req.onblocked = function () { reject(new Error('indexedDB blocked')); };
    }).catch(function (e) {
      backend = 'localstorage';
      console.warn('[JimmysKanban] IndexedDB 不可用，改用 localStorage：', e);
      return null;
    });
    return dbPromise;
  }

  function idbGet(db, key) {
    return new Promise(function (resolve, reject) {
      var r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }

  function idbSet(db, key, value) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  function get(key) {
    return openDB().then(function (db) {
      if (db) return idbGet(db, key);
      var raw = root.localStorage.getItem(LS_PREFIX + key);
      return raw ? JSON.parse(raw) : undefined;
    });
  }

  function set(key, value) {
    return openDB().then(function (db) {
      if (db) return idbSet(db, key, value);
      root.localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    });
  }

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  /* ---------- 公開 API ---------- */

  function loadState() { return get('state'); }

  var saveTimer = null;
  var pending = null;
  /** 防抖存檔（250ms），避免拖拉時狂寫 */
  function saveState(state) {
    pending = clone(state);
    clearTimeout(saveTimer);
    return new Promise(function (resolve) {
      saveTimer = setTimeout(function () {
        var s = pending; pending = null;
        set('state', s).then(function () { return maybeAutoSnapshot(s); }).then(resolve, function (e) {
          console.error('[JimmysKanban] 存檔失敗', e);
          resolve();
        });
      }, 250);
    });
  }

  /** 立即寫入（關閉頁面前） */
  function flush() {
    if (!pending) return Promise.resolve();
    clearTimeout(saveTimer);
    var s = pending; pending = null;
    return set('state', s);
  }

  function listSnapshots() {
    return get('snapshots').then(function (v) { return Array.isArray(v) ? v : []; });
  }

  /** 建立快照；reason: 'auto' | 'manual' | 'before-import' | 'before-clear' */
  function addSnapshot(state, reason) {
    return listSnapshots().then(function (list) {
      list.unshift({
        id: 'snap-' + Date.now(),
        at: new Date().toISOString(),
        reason: reason || 'manual',
        cards: state.cards.length,
        columns: state.columns.length,
        state: clone(state)
      });
      return set('snapshots', list.slice(0, MAX_SNAPSHOTS));
    });
  }

  function maybeAutoSnapshot(state) {
    return listSnapshots().then(function (list) {
      var lastAuto = list.find(function (s) { return s.reason === 'auto'; });
      if (lastAuto && Date.now() - Date.parse(lastAuto.at) < SNAPSHOT_INTERVAL_MS) return;
      return addSnapshot(state, 'auto');
    });
  }

  function deleteSnapshot(id) {
    return listSnapshots().then(function (list) {
      return set('snapshots', list.filter(function (s) { return s.id !== id; }));
    });
  }

  /** 要求瀏覽器「持久保存」，降低磁碟空間不足時被清除的機率 */
  function requestPersistence() {
    if (root.navigator && navigator.storage && navigator.storage.persist) {
      return navigator.storage.persisted().then(function (p) { return p || navigator.storage.persist(); })
        .catch(function () { return false; });
    }
    return Promise.resolve(false);
  }

  function estimate() {
    if (root.navigator && navigator.storage && navigator.storage.estimate) return navigator.storage.estimate();
    return Promise.resolve(null);
  }

  root.JK = root.JK || {};
  root.JK.storage = {
    loadState: loadState, saveState: saveState, flush: flush,
    listSnapshots: listSnapshots, addSnapshot: addSnapshot, deleteSnapshot: deleteSnapshot,
    requestPersistence: requestPersistence, estimate: estimate,
    backend: function () { return backend; },
    ready: openDB
  };
})(window);
