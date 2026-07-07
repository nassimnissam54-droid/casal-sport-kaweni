/* ==========================================================================
   admin.js — espace magasin : commandes + CRUD produits.
   Le mot de passe est vérifié CÔTÉ SERVEUR par les functions (x-admin-key),
   jamais présent dans le code du site.
   ========================================================================== */
import { fmt } from "./store.js";

const $ = (s) => document.querySelector(s);
let adminKey = sessionStorage.getItem("casal_admin_key") || "";

const api = async (path, options = {}) => {
  const r = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
      ...(options.headers || {}),
    },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Erreur ${r.status}`);
  return data;
};

/* ------------------------------------------------------------ Connexion */
$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  adminKey = $("#admin-pass").value;
  const errBox = $("#login-error");
  errBox.hidden = true;
  try {
    await api("/api/orders?q="); // vérifie le mot de passe côté serveur
    sessionStorage.setItem("casal_admin_key", adminKey);
    openDash();
  } catch (err) {
    errBox.textContent = /fetch|404|502|503/.test(err.message)
      ? "Serveur injoignable — l'admin ne fonctionne qu'une fois le site déployé sur Netlify (ou avec « npx netlify dev » en local)."
      : err.message;
    errBox.hidden = false;
  }
});

if (adminKey) {
  api("/api/orders?q=").then(openDash).catch(() => sessionStorage.removeItem("casal_admin_key"));
}

function openDash() {
  $("#login-view").hidden = true;
  $("#dash-view").hidden = false;
  loadOrders();
  loadProducts();
}

/* ----------------------------------------------------------------- Tabs */
document.querySelectorAll(".admin-tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach((t) => t.setAttribute("aria-selected", "false"));
    tab.setAttribute("aria-selected", "true");
    $("#tab-orders").hidden = tab.dataset.tab !== "orders";
    $("#tab-products").hidden = tab.dataset.tab !== "products";
  })
);

function showError(msg) {
  const box = $("#dash-error");
  box.textContent = msg;
  box.hidden = false;
  setTimeout(() => (box.hidden = true), 6000);
}

/* ------------------------------------------------------------ Commandes */
const PAY_SHORT = {
  card_online: "CB en ligne", card_store: "CB au magasin",
  cash: "Espèces", transfer: "Virement",
};

async function loadOrders() {
  try {
    const q = $("#order-search").value.trim();
    const orders = await api("/api/orders?q=" + encodeURIComponent(q));
    $("#orders-empty").hidden = orders.length > 0;
    $("#orders-body").innerHTML = orders
      .map((o) => {
        const paid = o.paymentStatus === "paye";
        const done = o.pickupStatus === "retire";
        return `<tr data-id="${o.orderId}">
        <td>${new Date(o.createdAt).toLocaleDateString("fr-FR")}<br><small style="color:var(--text-dim)">${o.orderId}</small></td>
        <td style="font-weight:800;letter-spacing:.06em">${o.pickupCode}</td>
        <td>${o.customer.name}<br><small style="color:var(--text-dim)">${o.customer.phone}</small></td>
        <td>${o.items.map((i) => `${i.qty}× ${i.name} (${i.size})`).join("<br>")}</td>
        <td style="font-weight:800">${fmt(o.total)}</td>
        <td><span class="status-pill ${paid ? "status-paid" : "status-unpaid"}">${paid ? "Payé" : PAY_SHORT[o.payment] || o.payment}</span>
            ${paid ? "" : `<br><button class="btn btn-ghost btn-sm mark-paid" style="margin-top:.3rem">✓ Payé</button>`}</td>
        <td><span class="status-pill ${done ? "status-done" : "status-pending"}">${done ? "Retiré" : "En attente"}</span></td>
        <td>${done ? "" : `<button class="btn btn-primary btn-sm mark-done">Marquer retiré</button>`}</td>
      </tr>`;
      })
      .join("");
  } catch (err) {
    showError(err.message);
  }
}

$("#orders-refresh").addEventListener("click", loadOrders);
let searchTimer;
$("#order-search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadOrders, 350);
});

$("#orders-body").addEventListener("click", async (e) => {
  const row = e.target.closest("tr");
  if (!row) return;
  try {
    if (e.target.classList.contains("mark-done"))
      await api("/api/orders", { method: "PATCH", body: JSON.stringify({ id: row.dataset.id, pickupStatus: "retire" }) });
    else if (e.target.classList.contains("mark-paid"))
      await api("/api/orders", { method: "PATCH", body: JSON.stringify({ id: row.dataset.id, paymentStatus: "paye" }) });
    else return;
    loadOrders();
  } catch (err) {
    showError(err.message);
  }
});

/* ------------------------------------------------------------- Produits */
let products = [];

async function loadProducts() {
  try {
    products = await fetch("/api/products").then((r) => r.json());
    $("#products-body").innerHTML = products
      .map(
        (p) => `<tr data-id="${p.id}">
        <td>${p.name}<br><small style="color:var(--text-dim)">${p.id}</small></td>
        <td>${fmt(p.price)}</td>
        <td>${p.stock}</td>
        <td>${p.category} · ${p.sport}</td>
        <td>
          <button class="btn btn-ghost btn-sm p-edit">Modifier</button>
          <button class="btn btn-ghost btn-sm p-del" style="color:var(--accent)">Suppr.</button>
        </td>
      </tr>`
      )
      .join("");
  } catch (err) {
    showError(err.message);
  }
}

$("#products-body").addEventListener("click", async (e) => {
  const row = e.target.closest("tr");
  if (!row) return;
  const p = products.find((x) => x.id === row.dataset.id);
  if (e.target.classList.contains("p-edit") && p) {
    $("#product-form-title").textContent = `Modifier « ${p.name} »`;
    $("#pf-id").value = p.id;
    $("#pf-name").value = p.name;
    $("#pf-price").value = p.price;
    $("#pf-stock").value = p.stock;
    $("#pf-image").value = p.image;
    $("#pf-featured").checked = !!p.featured;
    $("#pf-category").value = p.category;
    $("#pf-sport").value = p.sport;
    $("#pf-genre").value = p.genre;
    $("#pf-sizes").value = (p.sizes || []).join(", ");
    $("#pf-colors").value = (p.colors || []).join(", ");
    $("#pf-matiere").value = p.matiere || "";
    $("#pf-desc").value = p.description || "";
    $("#product-form").scrollIntoView({ behavior: "smooth" });
  }
  if (e.target.classList.contains("p-del") && p && confirm(`Supprimer « ${p.name} » ?`)) {
    try {
      await api("/api/products", { method: "POST", body: JSON.stringify({ action: "delete", id: p.id }) });
      loadProducts();
    } catch (err) {
      showError(err.message);
    }
  }
});

$("#product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const product = {
    id: $("#pf-id").value.trim(),
    name: $("#pf-name").value.trim(),
    price: Number($("#pf-price").value),
    stock: Number($("#pf-stock").value),
    image: $("#pf-image").value.trim() || "img/p-default.svg",
    featured: $("#pf-featured").checked,
    category: $("#pf-category").value,
    sport: $("#pf-sport").value,
    genre: $("#pf-genre").value,
    sizes: $("#pf-sizes").value,
    colors: $("#pf-colors").value,
    matiere: $("#pf-matiere").value.trim(),
    description: $("#pf-desc").value.trim(),
  };
  try {
    await api("/api/products", { method: "POST", body: JSON.stringify({ action: "upsert", product }) });
    $("#product-form").reset();
    $("#product-form-title").textContent = "Ajouter un produit";
    loadProducts();
  } catch (err) {
    showError(err.message);
  }
});

$("#pf-cancel").addEventListener("click", () => {
  $("#product-form-title").textContent = "Ajouter un produit";
});

$("#products-reset").addEventListener("click", async () => {
  if (!confirm("Écraser les modifications et repartir du fichier products.json ?")) return;
  try {
    await api("/api/products", { method: "POST", body: JSON.stringify({ action: "reset" }) });
    loadProducts();
  } catch (err) {
    showError(err.message);
  }
});
