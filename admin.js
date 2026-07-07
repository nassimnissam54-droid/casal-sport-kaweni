/* ============================================================
   ADMIN — CASAL SPORT
   ⚠️ Auth client uniquement. Pour vraie sécurité : Netlify Identity.
   ============================================================ */

const ADMIN_PASSWORD   = 'Lafamillejoi2*';
// Nommés ADMIN_* pour ne pas entrer en collision avec SESSION_KEY
// déclaré dans products.js (espace client), chargé sur la même page.
const ADMIN_SESSION_KEY      = 'casal_admin_session';
const ADMIN_SESSION_DURATION = 1000 * 60 * 60 * 4; // 4h

/* ============ LOGIN ============ */
const loginScreen = document.getElementById('loginScreen');
const dashboard   = document.getElementById('dashboard');
const loginForm   = document.getElementById('loginForm');
const loginError  = document.getElementById('loginError');

function isLogged() {
  const t = parseInt(localStorage.getItem(ADMIN_SESSION_KEY) || '0', 10);
  return Date.now() - t < ADMIN_SESSION_DURATION;
}
function login() {
  localStorage.setItem(ADMIN_SESSION_KEY, Date.now().toString());
  showDashboard();
}
function logout() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  loginScreen.classList.remove('hidden');
  dashboard.classList.add('hidden');
  document.getElementById('loginPwd').value = '';
}
function showDashboard() {
  loginScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  refreshAll();
}

loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const pwd = document.getElementById('loginPwd').value;
  if (pwd === ADMIN_PASSWORD) {
    loginError.textContent = '';
    login();
  } else {
    loginError.textContent = '❌ Mot de passe incorrect';
    document.getElementById('loginPwd').value = '';
  }
});
document.getElementById('logoutBtn').addEventListener('click', logout);
// Session déjà ouverte : n'ouvre le dashboard qu'une fois TOUT le script
// initialisé (sinon renderTable crashe sur les const déclarées plus bas).
document.addEventListener('DOMContentLoaded', () => { if (isLogged()) showDashboard(); });

/* ============ ONGLETS ============ */
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('#paneProducts, #paneOrders').forEach(p => p.hidden = true);
    document.getElementById(tab.dataset.pane).hidden = false;
    if (tab.dataset.pane === 'paneOrders') renderOrders();
  });
});

/* ============ TOAST ============ */
const toast = document.getElementById('toast');
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ============ FORMULAIRE PRODUIT ============ */
const form        = document.getElementById('productForm');
const formTitle   = document.getElementById('formTitle');
const submitBtn   = document.getElementById('submitBtn');
const cancelBtn   = document.getElementById('cancelBtn');

function resetForm() {
  form.reset();
  document.getElementById('pid').value = '';
  document.getElementById('pcolor1').value = '#06B6A8';
  document.getElementById('pcolor2').value = '#FF6B5C';
  document.getElementById('pstatus').value = 'live';
  document.getElementById('pstock').value  = 'in';
  document.getElementById('imagePreviewWrap').style.display = 'none';
  formTitle.textContent = '➕ Ajouter un produit';
  submitBtn.textContent = 'Ajouter le produit';
  cancelBtn.hidden = true;
}
cancelBtn.addEventListener('click', resetForm);

/* Aperçu image */
function updateImagePreview(src) {
  const wrap = document.getElementById('imagePreviewWrap');
  const img  = document.getElementById('imagePreview');
  if (src) {
    img.src = src;
    wrap.style.display = '';
  } else {
    wrap.style.display = 'none';
  }
}
document.getElementById('pimage').addEventListener('input', e => {
  updateImagePreview(e.target.value.trim());
});
document.getElementById('pfile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 800 * 1024) {
    showToast('⚠️ Image > 800 Ko. Privilégier une URL.');
  }
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('pimage').value = ev.target.result;
    updateImagePreview(ev.target.result);
  };
  reader.readAsDataURL(file);
});

form.addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('pid').value;
  const data = {
    name:     document.getElementById('pname').value.trim(),
    sub:      document.getElementById('psub').value,
    // Le type technique (section Textile ou Chaussures) découle du type d'article
    type:     document.getElementById('psub').value === 'basket' ? 'basket' : 'vetement',
    cat:      document.getElementById('pcat').value,
    price:    parseFloat(document.getElementById('pprice').value),
    oldPrice: document.getElementById('poldprice').value ? parseFloat(document.getElementById('poldprice').value) : null,
    badge:    document.getElementById('pbadge').value.trim(),
    stock:    document.getElementById('pstock').value,
    status:   document.getElementById('pstatus').value,
    icon:     document.getElementById('picon').value.trim() || '🛍️',
    imageUrl: document.getElementById('pimage').value.trim(),
    sizes:    document.getElementById('psizes').value.trim(),
    material: document.getElementById('pmaterial').value.trim(),
    desc:     document.getElementById('pdesc').value.trim(),
    color1:   document.getElementById('pcolor1').value,
    color2:   document.getElementById('pcolor2').value
  };
  if (id) {
    ProductDB.update(parseInt(id, 10), data);
    showToast('✏️ Produit modifié');
  } else {
    ProductDB.add(data);
    showToast('✅ Produit ajouté');
  }
  resetForm();
  refreshAll();
});

function editProduct(id) {
  const p = ProductDB.getAll().find(x => x.id === id);
  if (!p) return;
  document.getElementById('pid').value       = p.id;
  document.getElementById('pname').value     = p.name;
  document.getElementById('psub').value      = p.sub || (p.type === 'basket' ? 'basket' : 'equipement');
  document.getElementById('pcat').value      = p.cat;
  document.getElementById('pprice').value    = p.price;
  document.getElementById('poldprice').value = p.oldPrice ?? '';
  document.getElementById('pbadge').value    = p.badge ?? '';
  document.getElementById('pstock').value    = p.stock || 'in';
  document.getElementById('pstatus').value   = p.status || 'live';
  document.getElementById('picon').value     = p.icon;
  document.getElementById('pimage').value    = p.imageUrl ?? '';
  updateImagePreview(p.imageUrl);
  document.getElementById('psizes').value    = p.sizes;
  document.getElementById('pmaterial').value = p.material;
  document.getElementById('pdesc').value     = p.desc;
  document.getElementById('pcolor1').value   = p.color1 || '#06B6A8';
  document.getElementById('pcolor2').value   = p.color2 || '#FF6B5C';
  formTitle.textContent = '✏️ Modifier le produit';
  submitBtn.textContent = 'Enregistrer les modifications';
  cancelBtn.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteProduct(id) {
  const p = ProductDB.getAll().find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Supprimer définitivement « ${p.name} » ?`)) return;
  ProductDB.remove(id);
  showToast('🗑️ Produit supprimé');
  refreshAll();
}

function duplicateProduct(id) {
  const copy = ProductDB.duplicate(id);
  if (copy) {
    showToast(`📋 « ${copy.name} » créé en brouillon`);
    refreshAll();
  }
}

function toggleStatus(id) {
  const p = ProductDB.toggleStatus(id);
  showToast(p.status === 'live' ? '🟢 Mis en ligne' : '📝 Mis en brouillon');
  refreshAll();
}

document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Réinitialiser tous les produits ? Cette action est irréversible.')) return;
  ProductDB.reset();
  showToast('🔄 Catalogue réinitialisé');
  refreshAll();
});

/* ============ EXPORT CSV ============ */
document.getElementById('exportBtn').addEventListener('click', () => {
  const csv  = ProductDB.exportCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `casal-catalogue-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📊 CSV exporté');
});

/* ============ TABLE PRODUITS ============ */
const tbody       = document.getElementById('productsTbody');
const searchBox   = document.getElementById('searchBox');
const filterType  = document.getElementById('filterType');
const filterCat   = document.getElementById('filterCat');
const filterStatusEl = document.getElementById('filterStatus');

[searchBox, filterType, filterCat, filterStatusEl].forEach(el =>
  el.addEventListener('input', renderTable)
);

function renderTable() {
  const q  = searchBox.value.trim().toLowerCase();
  const ft = filterType.value;
  const fc = filterCat.value;
  const fs = filterStatusEl.value;
  const list = ProductDB.getAll().filter(p =>
    (ft === 'all' || (p.sub || (p.type === 'basket' ? 'basket' : 'equipement')) === ft) &&
    (fc === 'all' || p.cat === fc)  &&
    (fs === 'all' || (p.status || 'live') === fs) &&
    (!q || p.name.toLowerCase().includes(q) || (p.desc||'').toLowerCase().includes(q))
  );
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;opacity:.6">Aucun produit trouvé.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(p => {
    const stockMap = { in:'✓ En stock', low:'⚠️ Bas', out:'✗ Rupture' };
    const status = p.status || 'live';
    return `
    <tr>
      <td>
        <div class="row-thumb" style="background:linear-gradient(135deg,${p.color1},${p.color2})">
          ${p.imageUrl
            ? `<img src="${esc(p.imageUrl)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${p.icon}'}))">`
            : p.icon}
        </div>
      </td>
      <td>
        <strong>${esc(p.name)}</strong>
        ${p.badge ? `<span class="row-badge">${esc(p.badge)}</span>` : ''}
      </td>
      <td>
        ${SUB_LABELS[p.sub] || (p.type === 'basket' ? 'Basket' : 'Vêt.')}<br>
        <span class="cat-label ${p.cat}" style="font-size:0.65rem">${labelOf(p.cat)}</span>
      </td>
      <td>
        <strong>${p.price.toFixed(2)} €</strong>
        ${p.oldPrice ? `<br><small style="text-decoration:line-through;opacity:.6">${p.oldPrice.toFixed(2)} €</small>` : ''}
      </td>
      <td><small>${stockMap[p.stock || 'in']}</small></td>
      <td><span class="row-status ${status}">${status === 'live' ? 'En ligne' : 'Brouillon'}</span></td>
      <td>
        <button class="btn-icon edit"   onclick="editProduct(${p.id})"   title="Modifier">✏️</button>
        <button class="btn-icon dup"    onclick="duplicateProduct(${p.id})" title="Dupliquer">📋</button>
        <button class="btn-icon toggle" onclick="toggleStatus(${p.id})"  title="Basculer en ligne/brouillon">${status === 'live' ? '👁️' : '🚀'}</button>
        <button class="btn-icon del"    onclick="deleteProduct(${p.id})" title="Supprimer">🗑️</button>
      </td>
    </tr>
  `;
  }).join('');
}

function refreshStats() {
  const all = ProductDB.getAll();
  document.getElementById('statTotal').textContent  = all.length;
  document.getElementById('statLive').textContent   = all.filter(p => (p.status||'live') === 'live').length;
  document.getElementById('statDraft').textContent  = all.filter(p => p.status === 'draft').length;
  document.getElementById('statPromo').textContent  = all.filter(p => p.oldPrice).length;
  document.getElementById('statOrders').textContent = OrderDB.count();
  const badge = document.getElementById('ordersBadge');
  const n = OrderDB.count();
  badge.textContent = n ? ` (${n})` : '';
}

function refreshAll() { renderTable(); refreshStats(); }

/* ============ COMMANDES REÇUES ============ */
function orderItemsSummary(o) {
  if (o.items && o.items.length) {
    return o.items.map(it => `${it.productName} (${it.size} × ${it.qty})`).join(' · ');
  }
  return o.productName ? `${o.productName} (${o.size} × ${o.qty})` : 'Commande';
}

function trackStepsHTML(o, clickable) {
  const idx = orderStatusIndex(o.status);
  const hist = {};
  (o.statusHistory || []).forEach(h => { hist[h.status] = h.date; });
  const steps = ORDER_STATUS_FLOW.map((s, i) => {
    const cls = i < idx ? 'done' : (i === idx ? 'done current' : '');
    const dateStr = hist[s.id]
      ? new Date(hist[s.id]).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })
      : '';
    const tag = clickable ? 'button' : 'div';
    return `<${tag} class="track-step ${cls}" ${clickable ? `type="button" data-order="${o.id}" data-status="${s.id}" title="Marquer : ${esc(s.label)}"` : ''}>
      <span class="track-dot">${s.icon}</span>
      <span class="track-label">${s.label}</span>
      <span class="track-date">${dateStr}</span>
    </${tag}>`;
  }).join('');
  return `<div class="track-steps ${clickable ? 'clickable dark' : ''}">${steps}</div>`;
}

function renderOrders() {
  const list = OrderDB.getAll();
  const wrap = document.getElementById('ordersList');
  if (!list.length) {
    wrap.innerHTML = `<p style="color:rgba(255,255,255,0.6);text-align:center;padding:3rem">📭 Aucune commande sauvegardée pour l'instant.</p>`;
    return;
  }
  wrap.innerHTML = list.map(o => {
    const cur = ORDER_STATUS_FLOW[orderStatusIndex(o.status)];
    return `
    <div class="order-card">
      <div class="order-card-head">
        <div>
          <strong>${esc(o.name || 'Client')}</strong> · ${esc(orderItemsSummary(o))}
          <br><small style="color:rgba(255,255,255,0.6)">📞 ${esc(o.phone || '—')} · 💵 ${esc(o.total || '')}${o.pickupCode ? ` · <strong style="color:#ffd166">🎫 ${esc(o.pickupCode)}</strong>` : ''}</small>
        </div>
        <div class="order-date">${new Date(o.date).toLocaleString('fr-FR')}
          <button class="btn-icon del" onclick="deleteOrder(${o.id})" style="margin-left:0.5rem" title="Supprimer">🗑️</button>
        </div>
      </div>

      ${trackStepsHTML(o, true)}
      <p class="track-status-line" style="color:rgba(255,255,255,0.75)">
        Statut actuel : <strong>${cur.icon} ${cur.label}</strong> — clique une étape pour mettre à jour
      </p>
      <div class="track-actions">
        <button class="btn-ghost notify" onclick="notifyClient(${o.id})">📲 Notifier le client (WhatsApp)</button>
        <button class="btn-ghost" onclick="copyTrackingLink(${o.id})">🔗 Copier le lien de suivi</button>
        <button class="btn-ghost" onclick="toggleOrderMsg(${o.id})">📄 Voir le message</button>
      </div>
      <pre id="orderMsg-${o.id}" hidden>${esc(o.message || '')}</pre>
    </div>
  `;
  }).join('');

  // Bind les étapes cliquables
  wrap.querySelectorAll('.track-step[data-order]').forEach(btn => {
    btn.addEventListener('click', () => {
      OrderDB.setStatus(parseInt(btn.dataset.order, 10), btn.dataset.status);
      renderOrders();
      const s = ORDER_STATUS_FLOW.find(x => x.id === btn.dataset.status);
      showToast(`${s.icon} Statut : ${s.label}`);
    });
  });
}

/** Normalise un téléphone FR/Mayotte/Réunion vers le format wa.me */
function waNumberOf(phone) {
  let d = String(phone || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+'))    return d.slice(1);
  if (d.startsWith('00'))   return d.slice(2);
  if (d.startsWith('0639') || d.startsWith('0692') || d.startsWith('0693'))
    return '262' + d.slice(1);            // Mayotte / Réunion mobile
  if (d.startsWith('0') && d.length === 10)
    return '33' + d.slice(1);             // France métropole
  return d;
}

function trackingUrlOf(id) {
  const payload = OrderDB.trackingPayload(id);
  return payload ? `https://casal-sport-kaweni.netlify.app/compte.html?track=${payload}` : null;
}

function notifyClient(id) {
  const o = OrderDB.getAll().find(x => x.id === id);
  if (!o) return;
  const cur = ORDER_STATUS_FLOW[orderStatusIndex(o.status)];
  const url = trackingUrlOf(id);
  const codeLine = (o.pickupCode && (o.status === 'prete' || o.status === 'confirmee' || o.status === 'preparation'))
    ? `\n🎫 Ton code de retrait : *${o.pickupCode}*\n📍 À présenter au magasin de Kawéni.\n`
    : '\n';
  const msg = `Bonjour ${o.name || ''} 👋

🛍️ Mise à jour de ta commande CASAL SPORT :
${cur.icon} *${cur.label}* — ${cur.desc}
${codeLine}
🔎 Suis ta commande en direct ici :
${url}

Merci pour ta confiance ! 💪`;
  const num = waNumberOf(o.phone);
  const base = num ? `https://wa.me/${num}` : 'https://wa.me/';
  window.open(`${base}?text=${encodeURIComponent(msg)}`, '_blank');
}

async function copyTrackingLink(id) {
  const url = trackingUrlOf(id);
  if (!url) return;
  try { await navigator.clipboard.writeText(url); showToast('🔗 Lien de suivi copié'); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
    showToast('🔗 Lien de suivi copié');
  }
}

function toggleOrderMsg(id) {
  const pre = document.getElementById('orderMsg-' + id);
  if (pre) pre.hidden = !pre.hidden;
}

function deleteOrder(id) {
  if (!confirm('Supprimer cette commande ?')) return;
  OrderDB.remove(id);
  renderOrders();
  refreshStats();
}
document.getElementById('clearOrdersBtn').addEventListener('click', () => {
  if (!confirm('Effacer TOUTES les commandes sauvegardées ?')) return;
  OrderDB.clear();
  renderOrders();
  refreshStats();
});

/* ============ Helpers ============ */
function labelOf(c) { return { homme:'Homme', femme:'Femme', garcon:'Garçon', fille:'Fille' }[c] || c; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

window.editProduct      = editProduct;
window.deleteProduct    = deleteProduct;
window.duplicateProduct = duplicateProduct;
window.toggleStatus     = toggleStatus;
window.deleteOrder      = deleteOrder;
window.notifyClient     = notifyClient;
window.copyTrackingLink = copyTrackingLink;
window.toggleOrderMsg   = toggleOrderMsg;
