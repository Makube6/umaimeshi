/* 共通処理: データ参照、URL生成、お気に入り、カード描画(クライアント側)
 * ヘッダー/フッター/静的コンテンツはビルド(build.ps1)が出力する。
 * カードの見た目は src/templates/partials/shop-card.html / course-card.html と揃えること。
 * v2: KG_DATA.shops は verified:true かつ status≠closed の店だけ(ビルドが絞る)。rating は無い。
 *     reviewCount(承認済み口コミ数)は T17 が data.js に埋める想定。無ければ 0 として扱い表示しない。
 * T22: サムネイルは絵文字ではなく /img/illust/cat-<category>.svg、競馬場カードは /img/illust/course-<id>.svg + 枠番(.waku) */
(function () {
  var D = window.KG_DATA || { categories: [], racecourses: [], shops: [] };
  var SITE = window.KG_SITE || {};
  var BASE = SITE.basePath || "";
  var FAV_KEY = "kg_favorites";
  var ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  var STATUS_BADGE = { closed: '<span class="badge badge--closed">閉店</span>', temporary: '<span class="badge badge--temp">期間限定</span>' };

  var KG = {
    data: D,
    site: SITE,
    base: BASE,
    course: function (id) { return D.racecourses.find(function (c) { return c.id === id; }); },
    shop: function (id) { return D.shops.find(function (s) { return s.id === id; }); },
    category: function (id) { return D.categories.find(function (c) { return c.id === id; }); },
    shopsOf: function (courseId) { return D.shops.filter(function (s) { return s.courseId === courseId; }); },
    url: {
      top: function () { return BASE + "/"; },
      course: function (id) { return BASE + "/courses/" + encodeURIComponent(id) + "/"; },
      category: function (id) { return BASE + "/categories/" + encodeURIComponent(id) + "/"; },
      shop: function (id) { return BASE + "/shops/" + encodeURIComponent(id) + "/"; },
      favorites: function () { return BASE + "/favorites/"; },
      illust: function (name) { return BASE + "/img/illust/" + encodeURIComponent(name) + ".svg"; }
    },
    yen: function (n) { return "¥" + Number(n).toLocaleString("ja-JP"); },
    esc: function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; }); },
    hasPrice: function (s) { return typeof s.priceMin === "number" && isFinite(s.priceMin); },
    priceLabel: function (s) { return KG.hasPrice(s) ? KG.yen(s.priceMin) + "〜" : "価格は現地で確認"; },
    place: function (s) { return (s.area && String(s.area).trim()) || s.floor || ""; },
    reviewCount: function (s) { var n = Number(s.reviewCount); return isFinite(n) && n > 0 ? n : 0; },

    // お気に入り(localStorage が使えない環境でも落ちない)
    favorites: function () {
      try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch (e) { return []; }
    },
    isFav: function (id) { return KG.favorites().indexOf(id) !== -1; },
    toggleFav: function (id) {
      var favs = KG.favorites();
      var next = favs.indexOf(id) !== -1 ? favs.filter(function (f) { return f !== id; }) : favs.concat(id);
      try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch (e) {}
      return next.indexOf(id) !== -1;
    },

    shopCard: function (s) {
      var cat = KG.category(s.category) || { name: "" };
      var course = KG.course(s.courseId) || { name: "" };
      var status = s.status || "open";
      var reviews = KG.reviewCount(s);
      return (
        '<a class="card shop-card" href="' + KG.url.shop(s.id) + '" data-category="' + KG.esc(s.category) + '" data-course="' + KG.esc(s.courseId) + '" data-status="' + KG.esc(status) + '">' +
          '<div class="thumb thumb--' + KG.esc(s.category) + '"><img src="' + KG.url.illust("cat-" + s.category) + '" alt="" width="120" height="120" loading="lazy"></div>' +
          '<div class="card-body">' +
            '<div class="meta">' +
              '<span class="badge">' + KG.esc(course.name) + '</span>' +
              '<span class="badge badge--sub">' + KG.esc(cat.name) + '</span>' +
              (STATUS_BADGE[status] || "") +
            '</div>' +
            '<h3>' + KG.esc(s.name) + '</h3>' +
            '<p class="desc">' + KG.esc(s.description) + '</p>' +
            '<div class="card-foot">' +
              '<span class="review-count"' + (reviews > 0 ? "" : " hidden") + '>口コミ ' + reviews + '件</span>' +
              '<span class="place">' + KG.esc(KG.place(s)) + '</span>' +
              '<span class="price">' + KG.esc(KG.priceLabel(s)) + '</span>' +
            '</div>' +
          '</div>' +
        '</a>'
      );
    },

    courseCard: function (c) {
      var count = KG.shopsOf(c.id).length;
      return (
        '<a class="card course-card course-card--' + KG.esc(c.side) + ' course-card--' + KG.esc(c.id) + '" href="' + KG.url.course(c.id) + '">' +
          '<span class="waku waku--' + KG.esc(c.id) + '" aria-hidden="true"></span>' +
          '<div class="course-illust"><img src="' + KG.url.illust("course-" + c.id) + '" alt="" width="160" height="100" loading="lazy"></div>' +
          '<div class="course-body">' +
            '<div class="course-region">' + KG.esc(c.region) + '</div>' +
            '<h3>' + KG.esc(c.name) + '</h3>' +
            '<p class="desc">' + KG.esc(c.description) + '</p>' +
            '<div class="card-foot"><span>開催: ' + KG.esc(c.season) + '</span><span>' + (count > 0 ? count + '店舗' : '掲載準備中') + '</span></div>' +
          '</div>' +
        '</a>'
      );
    }
  };

  window.KG = KG;
})();
