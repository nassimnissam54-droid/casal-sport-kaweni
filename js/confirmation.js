/* confirmation.js — affiche le code de retrait et le récap de la dernière commande */
import { fmt } from "./store.js";

const PAY_LABELS = {
  card_online: "Carte bancaire en ligne",
  card_store: "Carte bancaire au magasin (au retrait)",
  cash: "Espèces au retrait",
  transfer: "Virement bancaire",
};

let order = null;
try {
  order = JSON.parse(sessionStorage.getItem("casal_last_order"));
} catch { /* ignore */ }

if (!order) {
  // Pas de commande en session → retour boutique
  location.replace("boutique.html");
} else {
  document.getElementById("pickup-code").textContent = order.pickupCode;
  document.getElementById("order-ref").textContent =
    `Commande ${order.orderId} — ${new Date().toLocaleDateString("fr-FR")}`;
  document.getElementById("conf-total").textContent = fmt(order.total);
  document.getElementById("conf-payment").textContent = PAY_LABELS[order.payment] || order.payment;

  document.getElementById("conf-items").innerHTML = (order.items || [])
    .map(
      (i) => `<div class="summary-row">
        <span>${i.qty} × ${i.name} <small style="color:var(--text-dim)">(${i.size} · ${i.color})</small></span>
        <span>${fmt(i.price * i.qty)}</span>
      </div>`
    )
    .join("");

  // Paiement en ligne : bouton vers la page de paiement (SumUp/Stripe)
  if (order.paymentUrl) {
    const box = document.getElementById("pay-online-box");
    box.hidden = false;
    document.getElementById("pay-link").href = order.paymentUrl;
  }

  if (order.demo) {
    document.getElementById("email-note").textContent =
      "⚠️ Mode démo local : aucune commande réelle ni e-mail envoyé (les Netlify Functions ne tournent pas en préview locale).";
  } else if (order.emailSent === false) {
    document.getElementById("email-note").textContent =
      "⚠️ Le reçu e-mail n'a pas pu être envoyé — note bien ton code de retrait ci-dessus. Le magasin a bien reçu ta commande.";
  }
}
