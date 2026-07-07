/* boutique.js — catalogue : filtres, recherche, tri, deep-links (?cat= ?sport= ?genre=) */
import { loadProducts, productCard } from "./store.js";

const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const count = document.getElementById("results-count");
const search = document.getElementById("search");
const sort = document.getElementById("sort");
const priceRange = document.getElementById("price-range");
const priceOut = document.getElementById("price-out");

const checked = (id) =>
  [...document.querySelectorAll(`#${id} input:checked`)].map((i) => i.value);

let products = [];

function apply() {
  const cats = checked("f-cat");
  const sports = checked("f-sport");
  const genres = checked("f-genre");
  const maxPrice = Number(priceRange.value);
  const q = search.value.trim().toLowerCase();

  let list = products.filter(
    (p) =>
      (!cats.length || cats.includes(p.category)) &&
      (!sports.length || sports.includes(p.sport)) &&
      (!genres.length || genres.includes(p.genre)) &&
      p.price <= maxPrice &&
      (!q || `${p.name} ${p.description} ${p.sport}`.toLowerCase().includes(q))
  );

  switch (sort.value) {
    case "price-asc": list.sort((a, b) => a.price - b.price); break;
    case "price-desc": list.sort((a, b) => b.price - a.price); break;
    case "name": list.sort((a, b) => a.name.localeCompare(b.name, "fr")); break;
    default: list.sort((a, b) => (b.featured === true) - (a.featured === true));
  }

  grid.innerHTML = list.map(productCard).join("");
  empty.hidden = list.length > 0;
  count.textContent = `${list.length} produit${list.length > 1 ? "s" : ""}`;
}

/* Pré-coche les filtres passés en URL (liens des collections) */
function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  const map = { cat: "f-cat", sport: "f-sport", genre: "f-genre" };
  for (const [param, fieldset] of Object.entries(map)) {
    const v = params.get(param);
    if (!v) continue;
    const input = document.querySelector(`#${fieldset} input[value="${v}"]`);
    if (input) input.checked = true;
  }
  if (params.get("q")) search.value = params.get("q");
}

document.querySelectorAll(".filters input, #sort").forEach((el) =>
  el.addEventListener("input", apply)
);
search.addEventListener("input", apply);
priceRange.addEventListener("input", () => {
  priceOut.textContent = `${priceRange.value} €`;
  apply();
});
document.getElementById("clear-filters").addEventListener("click", () => {
  document.querySelectorAll(".filters input[type=checkbox]").forEach((i) => (i.checked = false));
  priceRange.value = priceRange.max;
  priceOut.textContent = `${priceRange.max} €`;
  search.value = "";
  apply();
});

loadProducts().then((list) => {
  products = list;
  applyUrlParams();
  apply();
});
