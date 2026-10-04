/* 競馬場ページ・ジャンル別ページ: チップで店舗カードを絞り込む(カードはビルドが静的に出力済み。JS は表示/非表示のみ)
 *   競馬場ページ   : <main data-course-id>   + #category-chips [data-cat]    → カードの data-category で絞る
 *   ジャンル別ページ: <main data-category-id> + #filter-chips   [data-course] → カードの data-course で絞る
 * 店舗 0 件のときはチップがビルド側で hidden、#…-empty に「準備中」の文言が入っている(ここでは触らない) */
document.addEventListener("DOMContentLoaded", function () {
  var setups = [
    { root: "[data-course-id]",   chips: "category-chips", list: "course-shops", empty: "course-empty", chipAttr: "data-cat",    cardAttr: "data-category" },
    { root: "[data-category-id]", chips: "filter-chips",   list: "filter-list",  empty: "filter-empty", chipAttr: "data-course", cardAttr: "data-course" }
  ];

  setups.forEach(function (cfg) {
    var root = document.querySelector(cfg.root);
    var chips = document.getElementById(cfg.chips);
    var list = document.getElementById(cfg.list);
    var empty = document.getElementById(cfg.empty);
    if (!root || !chips || !list) return;

    var cards = Array.prototype.slice.call(list.querySelectorAll(".shop-card"));
    if (cards.length === 0) return;   // 準備中表示はビルド済み

    function render(value) {
      var shown = 0;
      cards.forEach(function (card) {
        var on = !value || card.getAttribute(cfg.cardAttr) === value;
        card.hidden = !on;
        if (on) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    }

    chips.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn || !chips.contains(btn)) return;
      chips.querySelectorAll(".chip").forEach(function (b) { b.classList.toggle("is-active", b === btn); });
      render(btn.getAttribute(cfg.chipAttr) || "");
    });
    render("");
  });
});
