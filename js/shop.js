/* 店舗ページ: お気に入りボタン(店舗情報・メニュー・関連店舗はビルドが静的に出力済み)
 * T22: ボタンの中身は ハートの SVG + 文言(絵文字・記号は使わない)。shop.html の初期 markup と同じ形 */
document.addEventListener("DOMContentLoaded", function () {
  var root = document.querySelector("[data-shop-id]");
  var favBtn = document.getElementById("fav-btn");
  if (!root || !favBtn) return;
  var shopId = root.getAttribute("data-shop-id");
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"></path></svg>';

  function paintFav(on) {
    favBtn.innerHTML = HEART + "<span>" + (on ? "お気に入り登録済み" : "お気に入りに追加") + "</span>";
    favBtn.classList.toggle("is-active", on);
    favBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  paintFav(KG.isFav(shopId));
  favBtn.addEventListener("click", function () { paintFav(KG.toggleFav(shopId)); });
});
