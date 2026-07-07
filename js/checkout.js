/* ==========================================================================
   checkout.js — validation de commande.
   La commande est envoyée à la Netlify Function /api/create-order qui :
   recalcule les prix côté serveur, génère le code de retrait, enregistre
   la commande (Netlify Blobs) et envoie le reçu par e-mail.
   En préview locale SANS functions (localhost), un mode démo simule la
   réponse pour pouvoir tester le parcours de bout en bout.
   ========================================================================== */
import { getCart, cartTotal, clearCart, fmt } from "./store.js";

const cart = getCart();
if (!cart.length) location.replace("panier.html");

/* Récapitulatif */
document.getElementById("order-items").innerHTML = cart
  .map(
    (i) => `<div class="summary-row">
      <span>${i.qty} × ${i.name} <small style="color:var(--text-dim)">(${i.size})</small></span>
      <span>${fmt(i.price * i.qty)}</span>
    </div>`
  )
  .join("");
document.getElementById("total").textContent = fmt(cartTotal(cart));

const form = document.getElementById("checkout-form");
const errorBox = document.getElementById("form-error");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.hidden = true;

  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const phone = form.phone.value.trim();
  const payment = form.payment.value;

  if (!name || !email || !phone) return showError("Merci de remplir tous les champs obligatoires.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError("Adresse e-mail invalide.");

  submitBtn.disabled = true;
  submitBtn.textContent = "Commande en cours…";

  const payload = {
    customer: { name, email, phone },
    payment,
    items: cart.map((i) => ({ id: i.id, size: i.size, color: i.color, qty: i.qty })),
  };

  try {
    let order;
    try {
      const r = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(data.error || "server"), { business: Boolean(data.error) && r.status < 500 });
      order = data;
    } catch (err) {
      // Erreur métier renvoyée par la function (stock, e-mail invalide…) → affichée telle quelle
      if (err.business) throw err;
      // Mode démo : UNIQUEMENT en préview locale sans functions
      const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
      if (!isLocal) throw new Error("Le serveur de commande est momentanément indisponible. Réessaie dans quelques minutes.");
      order = demoOrder(payload);
    }

    sessionStorage.setItem("casal_last_order", JSON.stringify(order));
    clearCart();
    location.href = "confirmation.html";
  } catch (err) {
    showError(err.message || "Une erreur est survenue. Réessaie.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirmer la commande";
  }
});

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
  errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* Simulation locale (jamais utilisée en production) */
function demoOrder(payload) {
  const code = "CS-" + rnd4() + "-" + rnd4();
  return {
    demo: true,
    orderId: "CMD-DEMO-" + Date.now().toString(36).toUpperCase(),
    pickupCode: code,
    total: cartTotal(cart),
    payment: payload.payment,
    customer: payload.customer,
    items: cart,
    emailSent: false,
  };
}
function rnd4() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
