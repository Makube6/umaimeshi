/* お気に入り一覧: localStorage の店舗IDからカードを描画 */
document.addEventListener("DOMContentLoaded", function () {
  var list = document.getElementById("fav-list");
  if (!list) return;
  var shops = KG.favorites().map(KG.shop).filter(Boolean);
  if (shops.length) {
    list.innerHTML = shops.map(KG.shopCard).join("");
  }
});
