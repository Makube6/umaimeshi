/* トップページ: 検索(注目グルメ・競馬場一覧・ジャンルリンク・選択肢はビルドが静的に出力済み)
 * 並び順: おすすめ順(featured → 口コミ数 → 名前)/ 安い順(価格未掲載は後ろ)/ 名前順。rating は v2 で廃止 */
document.addEventListener("DOMContentLoaded", function () {
  var D = KG.data;
  var $ = function (id) { return document.getElementById(id); };
  var form = $("search-form");
  if (!form) return;

  var collator = (typeof Intl !== "undefined" && Intl.Collator) ? new Intl.Collator("ja") : null;
  function byName(a, b) {
    return collator ? collator.compare(a.name, b.name) : (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  }
  function byPrice(a, b) {
    var pa = KG.hasPrice(a), pb = KG.hasPrice(b);
    if (pa && pb) return a.priceMin - b.priceMin || byName(a, b);
    if (pa) return -1;
    if (pb) return 1;
    return byName(a, b);
  }
  function byRecommended(a, b) {
    var fa = a.featured ? 1 : 0, fb = b.featured ? 1 : 0;
    if (fa !== fb) return fb - fa;
    var ra = KG.reviewCount(a), rb = KG.reviewCount(b);
    if (ra !== rb) return rb - ra;
    return byName(a, b);
  }

  function search() {
    var q = $("q").value.trim().toLowerCase();
    var course = $("f-course").value;
    var category = $("f-category").value;
    var maxPrice = Number($("f-price").value) || Infinity;
    var sort = $("f-sort").value;

    var results = D.shops
      .filter(function (s) { return !course || s.courseId === course; })
      .filter(function (s) { return !category || s.category === category; })
      .filter(function (s) { return maxPrice === Infinity || (KG.hasPrice(s) && s.priceMin <= maxPrice); })
      .filter(function (s) {
        if (!q) return true;
        var text = [s.name, s.description, s.area, s.floor].concat(s.tags || [], (s.menu || []).map(function (m) { return m.name; })).join(" ").toLowerCase();
        return text.indexOf(q) !== -1;
      })
      .sort(sort === "price" ? byPrice : sort === "name" ? byName : byRecommended);

    $("result-count").textContent = results.length + "件見つかりました";
    $("search-results").innerHTML = results.length
      ? results.map(KG.shopCard).join("")
      : '<p class="empty">条件に合うグルメが見つかりませんでした。' + (D.shops.length === 0 ? '店舗情報は準備中です。' : '') + '</p>';
  }

  ["q", "f-course", "f-category", "f-price", "f-sort"].forEach(function (id) {
    $(id).addEventListener(id === "q" ? "input" : "change", search);
  });
  search();
});
