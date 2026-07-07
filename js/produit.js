/* produit.js — fiche produit : options, quantité, ajout panier, JSON-LD */
import {
  loadProducts, getProduct, addToCart, fmt, productCard,
  CATEGORY_LABELS, GENRE_LABELS,
} from "./store.js";

const id = new URLSearchParams(location.search).get("id");
let product = null;
let size = null;
let color = null;
let qty = 1;

const $ = (s) => document.querySelector(s);

function optionButtons(container, values, onPick) {
  container.innerHTML = "";
  values.forEach((v, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "opt-btn";
    b.textContent = v;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      container.querySelectorAll(".opt-btn").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      onPick(v);
    });
    container.appendChild(b);
    // Pré-sélection si option unique
    if (values.length === 1 && i === 0) b.click();
  });
}

async function init() {
  product = id ? await getProduct(id) : null;
  if (!product) {
    $("#not-found").hidden = false;
    document.querySelector("[aria-labelledby=related-title]").hidden = true;
    return;
  }

  document.title = `${product.name} — Casal Sport Kaweni`;
  $("#product-layout").hidden = false;
  $("#p-image").src = product.image;
  $("#p-image").alt = product.name;
  $("#p-cat").textContent = `${CATEGORY_LABELS[product.category] || product.category} · ${product.sport}`;
  $("#p-name").textContent = product.name;
  $("#p-price").textContent = fmt(product.price);
  $("#p-desc").textContent = product.description;
  $("#p-matiere").textContent = product.matiere;
  $("#p-sport").textContent = product.sport;
  $("#p-genre").textContent = GENRE_LABELS[product.genre] || product.genre;

  const stockEl = $("#p-stock");
  if (product.stock <= 0) {
    stockEl.innerHTML = '<span class="stock-out">Rupture de stock — repasse bientôt !</span>';
    $("#add-btn").disabled = true;
  } else if (product.stock <= 5) {
    stockEl.innerHTML = `<span class="stock-low">⚡ Plus que ${product.stock} en stock au magasin</span>`;
  } else {
    stockEl.innerHTML = '<span style="color:var(--ok)">✓ En stock au magasin de Kawéni</span>';
  }

  optionButtons($("#p-sizes"), product.sizes, (v) => (size = v));
  optionButtons($("#p-colors"), product.colors, (v) => (color = v));

  $("#qty-minus").addEventListener("click", () => setQty(qty - 1));
  $("#qty-plus").addEventListener("click", () => setQty(qty + 1));
  function setQty(v) {
    qty = Math.min(Math.max(1, v), Math.max(1, product.stock));
    $("#qty-out").textContent = qty;
  }

  $("#add-btn").addEventListener("click", () => {
    if (!size) return flash("Choisis une taille");
    if (!color) return flash("Choisis une couleur");
    addToCart(product, { size, color, qty });
  });

  function flash(msg) {
    import("./store.js").then((m) => m.toast(msg));
  }

  // SEO : données structurées Product
  const ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: new URL(product.image, location.href).href,
    material: product.matiere,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "EUR",
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  });
  document.head.appendChild(ld);

  // Suggestions : même sport ou même catégorie
  const all = await loadProducts();
  const related = all
    .filter((p) => p.id !== product.id && (p.sport === product.sport || p.category === product.category))
    .slice(0, 4);
  document.getElementById("related-grid").innerHTML = related.map(productCard).join("");
}

init();
