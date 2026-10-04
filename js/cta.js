/* cta.js — 導線モジュール(T3 → T12 で汎用化。SPEC §10)
 * 依存: なし(window.KG_SITE があれば読む。無くても例外で落ちない)
 * 設定: window.KG_SITE.promos = [{ id, slots:["hero"|"inline"|"sticky"], badge, title, text, url, buttonText }]
 *       url が空の promo は描画しない。旧キー KG_SITE.prediction(url/name/ctaText/ctaSub)があれば
 *       promos の id="prediction" に url が無いときだけ、その内容で補う(壊れない)。
 * スロット: <div data-cta="hero|inline|sticky" [data-promo="note,stay"]></div>
 *       data-promo で id を絞れる(省略時はそのスロットに該当する全 promo を縦に並べる。sticky は先頭 1 件だけ)。
 *       該当 promo が 1 件も無いスロットは hidden。
 * 計測: クリック時に window.KG_track('cta_click', { slot, promo, href })(analytics.js が無くても動く)
 * UTM:  utm_source=umaimeshi&utm_medium=cta&utm_campaign=<slot>-<promo.id>&utm_content=<path>
 * 表記: badge があればバッジを出す。badge が "PR" の promo は広告(アフィリエイト)である旨を本文に明記する(企画書 §5)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'kg_cta_sticky_closed';
  var CLOSE_TTL_MS = 24 * 60 * 60 * 1000; // 24時間
  var MOBILE_QUERY = '(max-width: 768px)';
  var UTM_SOURCE = 'umaimeshi';
  var SLOTS = ['hero', 'inline', 'sticky'];
  var PR_NOTE = 'このリンクは広告(アフィリエイト)を含みます。紹介内容は公式サイトの情報をもとにしています。';
  var PREDICTION_NOTE = '予想は参考情報です。馬券は自己責任でお楽しみください。';

  // promo id ごとの既定文言(site.json の title / text が空のときに使う)
  var DEFAULTS = {
    note: {
      title: '食べ歩きの記録と、くわしい特集は note で',
      text: 'サイトに載せきれない実食の感想や、競馬場ごとの食べ歩きコースを note の記事にまとめています。',
      buttonText: 'note で読む'
    },
    stay: {
      title: '遠方から来るなら、競馬場の近くに泊まる',
      text: '前日入りすれば朝一番の開門から食べ歩けます。最寄り駅周辺の宿泊先をまとめました。',
      buttonText: '宿泊先を探す'
    },
    prediction: {
      title: '今週の予想を無料で見る',
      text: '食事の前に、今週のレースもチェックしてみませんか。',
      buttonText: '今週の予想を無料で見る'
    }
  };

  function str(v) {
    return (v === undefined || v === null) ? '' : String(v).trim();
  }

  // ---- 設定の読み取り(防御的) ----
  function getSite() {
    var site = (typeof window !== 'undefined' && window.KG_SITE && typeof window.KG_SITE === 'object') ? window.KG_SITE : {};
    return { name: str(site.name) || 'ウマぃ飯', promos: normalizePromos(site) };
  }

  function normalizePromos(site) {
    var raw = Array.isArray(site.promos) ? site.promos : [];
    var out = [];
    var seen = {};
    for (var i = 0; i < raw.length; i++) {
      var p = raw[i];
      if (!p || typeof p !== 'object') continue;
      var id = str(p.id);
      if (!id || seen[id]) continue;
      var slots = Array.isArray(p.slots) ? p.slots.map(str).filter(function (s) { return SLOTS.indexOf(s) >= 0; }) : [];
      var def = DEFAULTS[id] || {};
      var promo = {
        id: id,
        slots: slots,
        badge: str(p.badge),
        name: str(p.name),
        title: str(p.title) || def.title || '',
        text: str(p.text) || def.text || '',
        url: str(p.url),
        buttonText: str(p.buttonText) || def.buttonText || str(p.title) || def.title || '詳しく見る'
      };
      seen[id] = promo;
      out.push(promo);
    }
    // 旧 prediction キーとの互換: promos に prediction の url が無いときだけ補う
    var legacy = (site.prediction && typeof site.prediction === 'object') ? site.prediction : null;
    if (legacy && str(legacy.url)) {
      var existing = seen.prediction;
      if (existing && !existing.url) {
        existing.url = str(legacy.url);
        existing.name = existing.name || str(legacy.name);
        if (!str(existing.title) || existing.title === DEFAULTS.prediction.title) existing.title = str(legacy.ctaText) || existing.title;
        if (str(legacy.ctaSub)) existing.text = str(legacy.ctaSub);
        if (str(legacy.ctaText)) existing.buttonText = str(legacy.ctaText);
        if (existing.slots.length === 0) existing.slots = SLOTS.slice();
      } else if (!existing) {
        out.push({
          id: 'prediction', slots: SLOTS.slice(), badge: '', name: str(legacy.name),
          title: str(legacy.ctaText) || DEFAULTS.prediction.title,
          text: str(legacy.ctaSub) || DEFAULTS.prediction.text,
          url: str(legacy.url),
          buttonText: str(legacy.ctaText) || DEFAULTS.prediction.buttonText
        });
      }
    }
    return out;
  }

  function isPR(promo) { return promo.badge.toUpperCase() === 'PR'; }

  // ---- URL に UTM を付与 ----
  function buildUrl(baseUrl, slot, promoId) {
    var url = str(baseUrl);
    if (!url) return '';
    var hash = '';
    var hashIdx = url.indexOf('#');
    if (hashIdx >= 0) {
      hash = url.slice(hashIdx);
      url = url.slice(0, hashIdx);
    }
    var path = '/';
    try { path = window.location.pathname || '/'; } catch (e) { /* ignore */ }
    var campaign = promoId ? (slot + '-' + promoId) : slot;
    var params = [
      'utm_source=' + UTM_SOURCE,
      'utm_medium=cta',
      'utm_campaign=' + encodeURIComponent(campaign),
      'utm_content=' + encodeURIComponent(path)
    ].join('&');
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    if (url.charAt(url.length - 1) === '?' || url.charAt(url.length - 1) === '&') sep = '';
    return url + sep + params + hash;
  }

  // ---- DOM ヘルパー(textContent で挿入するためエスケープ不要) ----
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null && text !== '') node.textContent = text;
    return node;
  }

  function makeLink(promo, slot, label, className) {
    var href = buildUrl(promo.url, slot, promo.id);
    var a = el('a', className, label);
    a.href = href;
    a.target = '_blank';
    a.rel = isPR(promo) ? 'noopener sponsored' : 'noopener';
    a.setAttribute('data-kg-tracked', 'cta_click');
    a.setAttribute('data-promo-id', promo.id);
    a.addEventListener('click', function () {
      track('cta_click', { slot: slot, promo: promo.id, href: href });
    });
    return a;
  }

  function makeBadge(promo) {
    if (!promo.badge) return null;
    var b = el('span', 'kg-cta__badge' + (isPR(promo) ? ' kg-cta__badge--pr' : ''), promo.badge);
    if (isPR(promo)) b.setAttribute('title', '広告・アフィリエイトリンクを含みます');
    return b;
  }

  function noteText(promo) {
    if (isPR(promo)) return PR_NOTE;
    if (promo.id === 'prediction') return PREDICTION_NOTE;
    return '';
  }

  function track(name, params) {
    try {
      if (typeof window.KG_track === 'function') window.KG_track(name, params);
    } catch (e) { /* 計測失敗で導線を止めない */ }
  }

  // ---- localStorage(不可でも落ちない) ----
  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }
  function isStickyClosed() {
    var raw = storageGet(STORAGE_KEY);
    if (!raw) return false;
    var t = parseInt(raw, 10);
    if (isNaN(t)) return false;
    return (Date.now() - t) < CLOSE_TTL_MS;
  }

  // ---- 各スロットの描画 ----
  function renderHero(slot, promo) {
    var root = el('section', 'kg-cta kg-cta--hero kg-cta--' + promo.id);
    root.setAttribute('aria-label', promo.title);
    root.setAttribute('data-promo-id', promo.id);
    var inner = el('div', 'kg-cta__inner');
    var body = el('div', 'kg-cta__body');
    var head = el('p', 'kg-cta__eyebrow');
    var badge = makeBadge(promo);
    if (badge) head.appendChild(badge);
    if (promo.name) head.appendChild(document.createTextNode((badge ? ' ' : '') + promo.name));
    if (head.childNodes.length) body.appendChild(head);
    body.appendChild(el('p', 'kg-cta__title', promo.title));
    if (promo.text) body.appendChild(el('p', 'kg-cta__sub', promo.text));
    var note = noteText(promo);
    if (note) body.appendChild(el('p', 'kg-cta__note', note));
    inner.appendChild(body);
    var action = el('div', 'kg-cta__action');
    action.appendChild(makeLink(promo, 'hero', promo.buttonText, 'kg-cta__btn'));
    inner.appendChild(action);
    root.appendChild(inner);
    slot.appendChild(root);
  }

  // T22: 絵文字ではなく線画 SVG(cta.css の .kg-cta__icon svg が線色・太さを当てる)
  var SVG_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">';
  var ICONS = {
    note: SVG_OPEN + '<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4M8 12h8M8 16h6"/></svg>',
    stay: SVG_OPEN + '<path d="M3 18V8M3 14h18v4M3 11h8V8h8a2 2 0 0 1 2 2v4"/><circle cx="7" cy="9" r="1.5"/></svg>',
    prediction: SVG_OPEN + '<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/></svg>',
    bowl: SVG_OPEN + '<path d="M3 11h18c0 5-4 9-9 9s-9-4-9-9zM6 11c2-3 10-3 12 0M9 17v3M15 17v3"/></svg>'
  };

  function renderInline(slot, promo) {
    var root = el('aside', 'kg-cta kg-cta--inline kg-cta--' + promo.id);
    root.setAttribute('aria-label', promo.title);
    root.setAttribute('data-promo-id', promo.id);
    var icon = el('div', 'kg-cta__icon');
    icon.innerHTML = ICONS[promo.id] || ICONS.bowl;   // 固定の SVG 文字列のみ(ユーザー入力は入らない)
    icon.setAttribute('aria-hidden', 'true');
    root.appendChild(icon);
    var body = el('div', 'kg-cta__body');
    var head = el('p', 'kg-cta__eyebrow');
    var badge = makeBadge(promo);
    if (badge) head.appendChild(badge);
    if (promo.name) head.appendChild(document.createTextNode((badge ? ' ' : '') + promo.name));
    if (head.childNodes.length) body.appendChild(head);
    body.appendChild(el('p', 'kg-cta__title', promo.title));
    if (promo.text) body.appendChild(el('p', 'kg-cta__sub', promo.text));
    var note = noteText(promo);
    if (note) body.appendChild(el('p', 'kg-cta__note', note));
    root.appendChild(body);
    var action = el('div', 'kg-cta__action');
    action.appendChild(makeLink(promo, 'inline', promo.buttonText, 'kg-cta__btn'));
    root.appendChild(action);
    slot.appendChild(root);
  }

  function renderSticky(slot, promo, site) {
    var root = el('div', 'kg-cta kg-cta--sticky kg-cta--' + promo.id);
    root.setAttribute('role', 'complementary');
    root.setAttribute('aria-label', promo.title);
    root.setAttribute('data-promo-id', promo.id);
    var body = el('div', 'kg-cta__body');
    var title = el('p', 'kg-cta__title');
    var badge = makeBadge(promo);
    if (badge) title.appendChild(badge);
    title.appendChild(document.createTextNode((badge ? ' ' : '') + (promo.name || promo.title || site.name)));
    body.appendChild(title);
    body.appendChild(el('p', 'kg-cta__sub', isPR(promo) ? '広告を含みます' : (promo.text || promo.title)));
    root.appendChild(body);
    root.appendChild(makeLink(promo, 'sticky', promo.buttonText, 'kg-cta__btn'));
    var close = el('button', 'kg-cta__close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', '閉じる');
    close.addEventListener('click', function () {
      storageSet(STORAGE_KEY, String(Date.now()));
      closeSticky(slot);
    });
    root.appendChild(close);
    slot.appendChild(root);
    bindStickyViewport();
  }

  function closeSticky(slot) {
    slot.innerHTML = '';
    slot.hidden = true;
    setStickyOpen(false);
  }

  var stickyBound = false;
  function bindStickyViewport() {
    if (stickyBound) return;
    stickyBound = true;
    var mq = null;
    try { mq = window.matchMedia ? window.matchMedia(MOBILE_QUERY) : null; } catch (e) { mq = null; }
    var update = function () {
      var hasSticky = !!document.querySelector('.kg-cta--sticky');
      setStickyOpen(hasSticky && (mq ? mq.matches : false));
    };
    update();
    if (mq) {
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', update);
      else if (typeof mq.addListener === 'function') mq.addListener(update);
    }
  }

  function setStickyOpen(open) {
    var html = document.documentElement;
    if (!html) return;
    if (open) html.classList.add('kg-sticky-open');
    else html.classList.remove('kg-sticky-open');
  }

  // スロットに描く promo を選ぶ: slots に該当・url 非空・data-promo で絞り込み
  function promosFor(site, kind, filter) {
    var ids = filter ? filter.split(',').map(str).filter(Boolean) : null;
    return site.promos.filter(function (p) {
      if (!p.url) return false;
      if (p.slots.indexOf(kind) < 0) return false;
      if (ids && ids.indexOf(p.id) < 0) return false;
      return true;
    });
  }

  // ---- エントリポイント ----
  function render() {
    var site = getSite();
    var slots = document.querySelectorAll('[data-cta]');
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      var kind = str(slot.getAttribute('data-cta'));
      slot.innerHTML = '';
      if (SLOTS.indexOf(kind) < 0) { slot.hidden = true; continue; }
      var list = promosFor(site, kind, str(slot.getAttribute('data-promo')));
      if (list.length === 0) { slot.hidden = true; continue; }
      if (kind === 'sticky' && isStickyClosed()) { slot.hidden = true; continue; }
      try {
        if (kind === 'sticky') {
          renderSticky(slot, list[0], site);
        } else {
          for (var j = 0; j < list.length; j++) {
            if (kind === 'hero') renderHero(slot, list[j]);
            else renderInline(slot, list[j]);
          }
        }
        slot.hidden = false;
      } catch (e) {
        slot.innerHTML = '';
        slot.hidden = true;
      }
    }
  }

  window.KG_CTA = { render: render, buildUrl: buildUrl, promos: function () { return getSite().promos; } };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
