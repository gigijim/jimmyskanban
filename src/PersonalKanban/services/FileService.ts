/* 匯出 / 匯入檔案。備份檔就是一般 .json，可放網路磁碟、OneDrive、隨身碟。 */

export const fileStamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

/** 存檔；Chrome/Edge 支援時用「另存新檔」對話框（可直接選資料夾），否則一般下載 */
export async function saveFile(content: string, filename: string, mime: string, ext: string): Promise<boolean> {
  const blob = new Blob([content], { type: mime });
  const w = window as any;
  if (w.showSaveFilePicker && window.isSecureContext && window.self === window.top) {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: filename, accept: { [mime]: [ext] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (e: any) {
      if (e && e.name === "AbortError") return false;
    }
  }
  return downloadBlob(blob, filename);
}

/** 開檔讀取 JSON；使用者取消時回傳 null */
export function pickJSON(): Promise<any | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return resolve(null);
      try {
        const text = await file.text();
        resolve(JSON.parse(text.replace(/^﻿/, "")));
      } catch (e) {
        reject(e);
      }
    };
    input.click();
  });
}
