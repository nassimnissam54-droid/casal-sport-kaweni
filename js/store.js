/* ==========================================================================
   store.js — noyau partagé : config magasin, produits, panier, header
   Chargé en module sur toutes les pages.
   ========================================================================== */

/** Infos magasin affichées sur le site (l'e-mail de reçu utilise les
 *  variables d'environnement Netlify — voir README). */
export const STORE = {
  name: "Casal Sport Kaweni",
  address: "Zone commerciale de Kawéni, 97600 Mamoudzou, Mayotte",
  phone: "0269 00 00 00", // À REMPLACER par le vrai numéro du magasin
  email: "contact@casalsport-kaweni.example", // À REMPLACER
  hours: "Lun–Sam : 8h30 – 17h30",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Casal+Sport+Kaweni+Mamoudzou+Mayotte",
};

export const fmt = (n) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

/* ------------------------------------------------------------- Produits */
let _products = null;

/** Charge le catalogue : API (produits gérés en admin) avec repli sur le
 *  fichier statique data/products.json (préviews locales sans functions). */
export async function loadProducts() {
  if (_products) return _products;
  try {
    const r = await fetch("/api/products");
    if (!r.ok) throw new Error("api " + r.status);
    _products = await r.json();
  } catch {
    const r = await fetch("data/products.json");
    _products = await r.json();
  }
  return _products;
}

export async function getProduct(id) {
  const list = await loadProducts();
  return list.find((p) => p.id === id) || null;
}

export const CATEGORY_LABELS = {
  chaussures: "Chaussures",
  textile: "Textile",
  equipement: "Équipement",
};
export const GENRE_LABELS = { homme: "Homme", femme: "Femme", enfant: "Enfant", mixte: "Mixte" };

/* --------------------------------------------------------------- Panier */
const CART_KEY = "casal_cart_v1";

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

export function addToCart(product, { size, color, qty = 1 }) {
  const cart = getCart();
  const key = `${product.id}|${size}|${color}`;
  const existing = cart.find((i) => i.key === key);
  if (existing) existing.qty += qty;
  else
    cart.push({
      key,
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      size,
      color,
      qty,
    });
  saveCart(cart);
  toast(`${product.name} ajouté au panier`);
}

export function setQty(key, qty) {
  let cart = getCart();
  const item = cart.find((i) => i.key === key);
  if (!item) return;
  item.qty = qty;
  if (item.qty <= 0) cart = cart.filter((i) => i.key !== key);
  saveCart(cart);
}

export function removeFromCart(key) {
  saveCart(getCart().filter((i) => i.key !== key));
}

export function clearCart() {
  saveCart([]);
}

export const cartTotal = (cart = getCart()) =>
  cart.reduce((s, i) => s + i.price * i.qty, 0);

export const cartCount = (cart = getCart()) => cart.reduce((s, i) => s + i.qty, 0);

export function updateCartBadge() {
  const el = document.querySelector(".cart-count");
  if (el) el.textContent = cartCount();
}

/* ----------------------------------------------------------------- UI */
export function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2600);
}

export function productCard(p) {
  const stock =
    p.stock <= 0
      ? '<span class="stock-out">Rupture de stock</span>'
      : p.stock <= 5
        ? `<span class="stock-low">Plus que ${p.stock} en stock</span>`
        : "";
  return `
    <a class="product-card" href="produit.html?id=${encodeURIComponent(p.id)}">
      <div class="thumb"><img src="${p.image}" alt="${p.name}" loading="lazy" width="400" height="400"></div>
      <div class="info">
        <span class="cat">${CATEGORY_LABELS[p.category] || p.category} · ${p.sport}</span>
        <h3>${p.name}</h3>
        ${stock}
        <span class="price">${fmt(p.price)}</span>
      </div>
    </a>`;
}

/* Menu mobile + badge panier au chargement */
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }
});
