// 只在 http(s) 下註冊 Service Worker（file:// 單檔版不需要）
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('SW 註冊失敗', e); });
  });
}
