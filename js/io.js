/*
 * JimmysKanban — 匯出 / 匯入（備份）
 * 備份檔就是一般 .json 檔：可放公司網路磁碟、OneDrive、隨身碟；不需任何外掛。
 */
(function (root) {
  'use strict';

  function stamp() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  /** 下載檔案；Chrome/Edge 支援時改用「另存新檔」對話框，可直接選資料夾 */
  function saveFile(content, filename, mime, ext) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    if (root.showSaveFilePicker && root.isSecureContext && root.self === root.top) {
      var types = [{ description: filename, accept: {} }];
      types[0].accept[mime] = [ext];
      return root.showSaveFilePicker({ suggestedName: filename, types: types })
        .then(function (h) { return h.createWritable(); })
        .then(function (w) { return w.write(blob).then(function () { return w.close(); }); })
        .then(function () { return true; })
        .catch(function (e) {
          if (e && e.name === 'AbortError') return false; // 使用者取消
          return downloadBlob(blob, filename);
        });
    }
    return Promise.resolve(downloadBlob(blob, filename));
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    return true;
  }

  function exportJSON(state) {
    var payload = Object.assign({ app: 'JimmysKanban', exportedAt: new Date().toISOString() }, state);
    return saveFile(JSON.stringify(payload, null, 2), 'jimmyskanban-backup-' + stamp() + '.json', 'application/json', '.json');
  }

  function exportCSV(state) {
    return saveFile(root.JK.model.toCSV(state), 'jimmyskanban-' + stamp() + '.csv', 'text/csv', '.csv');
  }

  function exportMarkdown(state) {
    return saveFile(root.JK.model.toMarkdown(state), 'jimmyskanban-' + stamp() + '.md', 'text/markdown', '.md');
  }

  /** 開檔讀取 JSON；回傳 Promise<object>，使用者取消時回傳 null */
  function pickJSON() {
    return new Promise(function (resolve, reject) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = function () {
        var f = input.files && input.files[0];
        if (!f) return resolve(null);
        readJSONFile(f).then(resolve, reject);
      };
      input.click();
    });
  }

  function readJSONFile(file) {
    return file.text().then(function (txt) {
      try { return JSON.parse(txt.replace(/^﻿/, '')); }
      catch (e) { throw new Error('不是有效的 JSON 檔案'); }
    });
  }

  root.JK = root.JK || {};
  root.JK.io = {
    exportJSON: exportJSON, exportCSV: exportCSV, exportMarkdown: exportMarkdown,
    pickJSON: pickJSON, readJSONFile: readJSONFile, fileStamp: stamp
  };
})(window);
