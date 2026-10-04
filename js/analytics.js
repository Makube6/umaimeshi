/* analytics.js — GA4 計測(T3)
 * 依存: なし(window.KG_SITE.ga4Id があれば gtag.js を動的に読み込む)
 * 提供: window.KG_track(eventName, params)
 * 外部リンク(別ホストの http(s) リンク)のクリックを outbound_click として計測する
 */
(function () {
  'use strict';

  function getGa4Id() {
    try {
      var site = window.KG_SITE;
      if (!site || typeof site !== 'object') return '';
      return site.ga4Id ? String(site.ga4Id).trim() : '';
    } catch (e) { return ''; }
  }

  // ---- gtag の読み込み ----
  function loadGtag(id) {
    if (!id) return;
    if (document.querySelector('script[data-kg-gtag]')) return; // 二重読み込み防止
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
    window.gtag('js', new Date());
    window.gtag('config', id, { anonymize_ip: true });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    s.setAttribute('data-kg-gtag', '1');
    (document.head || document.documentElement).appendChild(s);
  }

  // ---- イベント送信 ----
  function track(eventName, params) {
    var name = eventName ? String(eventName) : '';
    if (!name) return;
    var p = (params && typeof params === 'object') ? params : {};
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, p);
      } else if (window.console && typeof window.console.debug === 'function') {
        window.console.debug('[KG_track]', name, p);
      }
    } catch (e) { /* 計測失敗はページ動作に影響させない */ }
  }

  // ---- 外部リンクのクリック計測(委譲・1回だけ登録) ----
  function isOutbound(a) {
    var href = a.getAttribute('href') || '';
    if (!/^https?:\/\//i.test(href)) return false;
    var host = '';
    try { host = a.hostname || ''; } catch (e) { host = ''; }
    if (!host) return false;
    var here = '';
    try { here = window.location.hostname || ''; } catch (e) { here = ''; }
    return host.toLowerCase() !== here.toLowerCase();
  }

  function bindOutbound() {
    if (window.__kgOutboundBound) return;
    window.__kgOutboundBound = true;
    document.addEventListener('click', function (ev) {
      var target = ev.target;
      if (!target || typeof target.closest !== 'function') return;
      var a = target.closest('a[href]');
      if (!a) return;
      // CTA・シェアボタンは専用イベントで計測済みなので二重計上しない
      if (a.hasAttribute('data-kg-tracked')) return;
      if (!isOutbound(a)) return;
      track('outbound_click', { href: a.href, host: a.hostname });
    }, true);
  }

  window.KG_track = track;

  function init() {
    loadGtag(getGa4Id());
    bindOutbound();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
