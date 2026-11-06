import React from "react";
import ReactDOM from "react-dom";

// 字型打包在本機（原版從 Google Fonts 下載；公司內網 / 離線也能正常顯示）
import "@fontsource/nunito/300.css";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/700.css";

import StorageService from "PersonalKanban/services/StorageService";
import "./index.css";

declare const __SINGLE_FILE__: boolean;

StorageService.init().then(async () => {
  // 資料庫載入完成後才載入看板（原版在模組載入時同步讀取 localStorage）
  const { default: PersonalKanban } = await import("./PersonalKanban");
  ReactDOM.render(
    <React.StrictMode>
      <PersonalKanban />
    </React.StrictMode>,
    document.getElementById("root")
  );
});

// PWA：只在 http(s) 的正式版註冊 Service Worker（單一 HTML 檔版不需要）
if (!__SINGLE_FILE__ && import.meta.env.PROD && "serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("SW 註冊失敗", e));
  });
}
