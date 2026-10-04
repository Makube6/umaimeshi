/* share.js — SNS シェアボタン(T3)
 * 依存: なし(window.KG_SITE.twitter があれば X の via に使う)
 * スロット: <div data-share data-title="..." data-url="..."></div>
 * 計測: window.KG_track('share', { network })
 */
(function () {
  'use strict';

  var TOAST_MS = 2000;

  function str(v) {
    return (v === undefined || v === null) ? '' : String(v).trim();
  }

  function getTwitterAccount() {
    try {
      var site = window.KG_SITE;
      if (!site || typeof site !== 'object') return '';
      return str(site.twitter).replace(/^@/, '');
    } catch (e) { return ''; }
  }

  function track(network) {
    try {
      if (typeof window.KG_track === 'function') window.KG_track('share', { network: network });
    } catch (e) { /* ignore */ }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null && text !== '') node.textContent = text;
    return node;
  }

  function makeShareLink(network, href, label) {
    var a = el('a', 'kg-share__btn kg-share__btn--' + network, label);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('data-kg-tracked', 'share');
    a.setAttribute('aria-label', label + 'でシェア');
    a.addEventListener('click', function () { track(network); });
    return a;
  }

  function hasClipboard() {
    try {
      return !!(window.navigator && window.navigator.clipboard && typeof window.navigator.clipboard.writeText === 'function');
    } catch (e) { return false; }
  }

  function renderOne(slot) {
    var title = str(slot.getAttribute('data-title')) || str(document.title);
    var url = str(slot.getAttribute('data-url')) || str(window.location.href);
    var via = getTwitterAccount();

    var root = el('div', 'kg-share');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', 'このページをシェア');
    root.appendChild(el('span', 'kg-share__label', 'シェア'));

    // X(Twitter)
    var xHref = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url);
    if (via) xHref += '&via=' + encodeURIComponent(via);
    root.appendChild(makeShareLink('x', xHref, 'X'));

    // LINE
    var lineHref = 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(url);
    root.appendChild(makeShareLink('line', lineHref, 'LINE'));

    // URL コピー(clipboard API が無ければ出さない)
    if (hasClipboard()) {
      var btn = el('button', 'kg-share__btn kg-share__btn--copy', 'URLをコピー');
      btn.type = 'button';
      var toast = el('span', 'kg-share__toast');
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      var timer = null;
      var showToast = function (msg) {
        toast.textContent = msg;
        toast.classList.add('is-visible');
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
          toast.classList.remove('is-visible');
          toast.textContent = '';
        }, TOAST_MS);
      };
      btn.addEventListener('click', function () {
        try {
          window.navigator.clipboard.writeText(url).then(function () {
            showToast('コピーしました');
            track('copy');
          }, function () {
            showToast('コピーできませんでした');
          });
        } catch (e) {
          showToast('コピーできませんでした');
        }
      });
      root.appendChild(btn);
      root.appendChild(toast);
    }

    slot.innerHTML = '';
    slot.appendChild(root);
  }

  function render() {
    var slots = document.querySelectorAll('[data-share]');
    for (var i = 0; i < slots.length; i++) {
      try { renderOne(slots[i]); } catch (e) { /* 1つ失敗しても他は描画する */ }
    }
  }

  window.KG_SHARE = { render: render };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
