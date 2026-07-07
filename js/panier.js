/* panier.js — récapitulatif, quantités, suppression */
import { getCart, setQty, removeFromCart, cartTotal, fmt } from "./store.js";

const body = document.getElementById("cart-body");

function render() {
  const cart = getCart();
  const emptyEl = document.getElementById("cart-empty");
  const table = document.getElementById("cart-table");
  const summary = document.getElementById("summary");

  if (!cart.length) {
    table.hidden = true;
    summary.hidden = true;
    emptyEl.hidden = false;
    return;
  }
  table.hidden = false;
  summary.hidden = false;
  emptyEl.hidden = true;

  body.innerHTML = cart
    .map(
      (i) => `
    <tr data-key="${i.key}">
      <td>
        <div style="display:flex;gap:.9rem;align-items:center">
          <img src="${i.image}" alt="" width="64" height="64">
          <div>
            <div class="cart-item-name">${i.name}</div>
            <div class="cart-item-opts">${i.size} · ${i.color} · ${fmt(i.price)}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="qty-row">
          <button type="button" class="q-minus" aria-label="Diminuer">−</button>
          <output>${i.qty}</output>
          <button type="button" class="q-plus" aria-label="Augmenter">+</button>
        </div>
      </td>
      <td style="font-weight:800">${fmt(i.price * i.qty)}</td>
      <td><button type="button" class="remove-btn" aria-label="Retirer ${i.name}">✕</button></td>
    </tr>`
    )
    .join("");

  document.getElementById("subtotal").textContent = fmt(cartTotal(cart));
  document.getElementById("total").textContent = fmt(cartTotal(cart));
}

body.addEventListener("click", (e) => {
  const row = e.target.closest("tr");
  if (!row) return;
  const key = row.dataset.key;
  const item = getCart().find((i) => i.key === key);
  if (!item) return;
  if (e.target.classList.contains("q-minus")) setQty(key, item.qty - 1);
  else if (e.target.classList.contains("q-plus")) setQty(key, item.qty + 1);
  else if (e.target.classList.contains("remove-btn")) removeFromCart(key);
  else return;
  render();
});

render();
