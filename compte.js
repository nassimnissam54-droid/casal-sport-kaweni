/* ============================================================
   ZAK BOUTIK — Compte client (script)
   ============================================================ */

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

/* ============ TOAST ============ */
const toast = $('#toast');
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2500);
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* ============ ROUTING : AUTH ou DASHBOARD ============ */
const authScreen = $('#authScreen');
const dashboard  = $('#dashboard');

function showAuth() {
  authScreen.classList.remove('hidden');
  dashboard.classList.add('hidden');
}
function showDashboard() {
  authScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  refreshAll();
}

// Session déjà ouverte : ne route qu'une fois TOUT le script initialisé,
// sinon showDashboard() → initRating() crashe sur `currentStars` (TDZ,
// déclaré plus bas) et plus aucun bouton du compte ne répond.
document.addEventListener('DOMContentLoaded', () => {
  if (UserDB.isLoggedIn() && UserDB.exists()) {
    showDashboard();
  } else {
    showAuth();
  }
});

/* ============ AUTH TABS ============ */
/** Affiche un des formulaires : 'login' | 'signup' | 'forgot' */
function showAuthForm(target) {
  $('#loginForm').hidden  = target !== 'login';
  $('#signupForm').hidden = target !== 'signup';
  const forgot = $('#forgotForm');
  if (forgot) forgot.hidden = target !== 'forgot';
  // Les onglets ne concernent que login/signup (forgot n'a pas d'onglet)
  $$('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === target));
}
$$('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => showAuthForm(tab.dataset.tab));
});
$$('.auth-switch a').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    showAuthForm(a.dataset.go);
  });
});
$('#forgotLink')?.addEventListener('click', e => { e.preventDefault(); showAuthForm('forgot'); });

/* ============ LOGIN ============ */
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('#loginEmail').value;
  const pwd   = $('#loginPwd').value;
  const r = await UserDB.login(email, pwd);
  const errEl = $('#loginError');
  if (r.ok) {
    errEl.textContent = '';
    showToast('✅ Connecté');
    showDashboard();
  } else {
    errEl.textContent = '❌ ' + r.error;
  }
});

/* ============ SIGNUP ============ */
$('#signupForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    name:     $('#signupName').value,
    email:    $('#signupEmail').value,
    phone:    $('#signupPhone').value,
    password: $('#signupPwd').value
  };
  const r = await UserDB.signup(data);
  const errEl = $('#signupError');
  if (r.ok) {
    errEl.textContent = '';
    showToast('🎉 Compte créé');
    showDashboard();
  } else {
    errEl.textContent = '❌ ' + r.error;
  }
});

/* ============ MOT DE PASSE OUBLIÉ ============ */
$('#forgotForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('#forgotEmail').value;
  const pwd   = $('#forgotPwd').value;
  const pwd2  = $('#forgotPwd2').value;
  const errEl = $('#forgotError');
  if (pwd !== pwd2) { errEl.textContent = '❌ Les deux mots de passe ne correspondent pas.'; return; }
  const r = await UserDB.resetPassword(email, pwd);
  if (r.ok) {
    errEl.textContent = '';
    $('#forgotForm').reset();
    showToast('🔑 Mot de passe réinitialisé');
    showDashboard();
  } else {
    errEl.textContent = '❌ ' + r.error;
  }
});

/* ============ ONGLETS DASHBOARD ============ */
$$('.account-nav-item:not(.logout)').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.account-nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.account-pane').forEach(p => p.classList.remove('active'));
    document.getElementById(btn.dataset.pane).classList.add('active');
  });
});

/* ============ LOGOUT ============ */
$('#logoutBtn').addEventListener('click', () => {
  if (!confirm('Se déconnecter ?')) return;
  UserDB.logout();
  showAuth();
  showToast('👋 À bientôt');
});

/* ============ RAFRAÎCHIR TOUT ============ */
function refreshAll() {
  const u = UserDB.get();
  if (!u) { showAuth(); return; }
  // Sidebar user
  $('#userName').textContent  = u.name || u.email.split('@')[0];
  $('#userEmail').textContent = u.email;
  $('#userAvatar').textContent = (u.name || u.email).charAt(0).toUpperCase();
  // Profil cards
  $('#profileSince').textContent = new Date(u.createdAt).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
  const orders = OrderDB.getAll().filter(o => o.userEmail === u.email || !o.userEmail);
  $('#profileOrders').textContent = orders.length;
  const favs = (typeof WishlistDB !== 'undefined') ? WishlistDB.count() : 0;
  $('#profileFavs').textContent = favs;
  // Dernier code de retrait d'une commande non encore retirée
  const pending = orders.find(o => o.pickupCode && o.status !== 'retiree');
  $('#profilePickup').textContent = pending ? pending.pickupCode : '—';
  // Badges mini
  const ob = $('#ordersBadgeMini');
  if (orders.length) { ob.textContent = orders.length; ob.hidden = false; } else { ob.hidden = true; }
  // Sections individuelles
  renderOrders();
  fillInfoForm();
  initRating();
  // Récupère l'avancement décidé par la boutique (autre appareil)
  syncOrderStatusFromServer();
}

/* ============================================================
   SUIVI EN TEMPS RÉEL — le pro change le statut dans l'admin,
   le client en est informé ici (bandeau + badge + toast).
   Auth : les codes de retrait que le client possède déjà.
   ============================================================ */
const SEEN_STATUS_KEY = 'casal_seen_status_v1';

function seenStatuses() {
  try { return JSON.parse(localStorage.getItem(SEEN_STATUS_KEY) || '{}'); }
  catch { return {}; }
}
function markStatusSeen(code, status) {
  const s = seenStatuses();
  s[code] = status;
  localStorage.setItem(SEEN_STATUS_KEY, JSON.stringify(s));
}

/** Nouveautés non encore vues par le client */
let pendingNotifications = [];

async function syncOrderStatusFromServer() {
  const u = UserDB.get(); if (!u) return;
  const mine = OrderDB.getAll().filter(o =>
    (o.userEmail === u.email || !o.userEmail) && o.pickupCode);
  if (!mine.length) return;

  try {
    const r = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientLookup: true, codes: mine.map(o => o.pickupCode) })
    });
    if (!r.ok) return;
    const { orders: remote } = await r.json();
    if (!Array.isArray(remote) || !remote.length) return;

    const all = OrderDB.getAll();
    const seen = seenStatuses();
    let changed = false;
    pendingNotifications = [];

    remote.forEach(ro => {
      const local = all.find(o => o.pickupCode === ro.pickupCode);
      if (!local) return;
      // Le serveur fait foi : la boutique a pu avancer le suivi
      if (local.status !== ro.status) { local.status = ro.status; changed = true; }
      local.statusHistory = ro.statusHistory;
      // Statut jamais affiché à ce client → notification
      if (seen[ro.pickupCode] !== ro.status) {
        pendingNotifications.push({ code: ro.pickupCode, status: ro.status });
      }
    });

    if (changed) OrderDB._save(all);
    if (pendingNotifications.length) {
      renderOrders();
      showStatusNotifications();
    } else if (changed) {
      renderOrders();
    }
  } catch { /* hors-ligne : on garde le suivi local */ }
}

/** Bandeau + badge + toast pour les avancements non vus */
function showStatusNotifications() {
  const wrap = $('#ordersList');
  if (!wrap) return;

  // Bandeau en tête de la liste des commandes
  const banner = document.createElement('div');
  banner.className = 'status-alerts';
  banner.innerHTML = pendingNotifications.map(n => {
    const step = ORDER_STATUS_FLOW[orderStatusIndex(n.status)];
    const isReady = n.status === 'prete';
    const isCancel = n.status === 'annulee';
    return `<div class="status-alert ${isReady ? 'ready' : ''} ${isCancel ? 'cancel' : ''}" data-code="${esc(n.code)}">
      <span class="sa-icon">${isCancel ? '🚫' : step.icon}</span>
      <div class="sa-text">
        <strong>${isCancel ? 'Commande annulée' : step.label}</strong>
        <span>Commande ${esc(n.code)} — ${isCancel ? 'cette commande a été annulée.' : esc(step.desc)}</span>
      </div>
      <button type="button" class="sa-close" aria-label="J'ai vu">✓</button>
    </div>`;
  }).join('');
  wrap.prepend(banner);

  // Badge sur l'onglet « Mes commandes »
  const badge = $('#ordersBadgeMini');
  if (badge) {
    badge.textContent = pendingNotifications.length;
    badge.hidden = false;
    badge.classList.add('badge-alert');
  }

  // Toast : le message le plus important (commande prête en priorité)
  const ready = pendingNotifications.find(n => n.status === 'prete');
  const first = ready || pendingNotifications[0];
  const step = ORDER_STATUS_FLOW[orderStatusIndex(first.status)];
  showToast(first.status === 'prete'
    ? `🛍️ Ta commande ${first.code} est prête au retrait !`
    : `${step.icon} Commande ${first.code} : ${step.label}`);

  // « ✓ J'ai vu » → on ne le renotifie plus
  banner.querySelectorAll('.sa-close').forEach(btn =>
    btn.addEventListener('click', () => {
      const card = btn.closest('.status-alert');
      const code = card.dataset.code;
      const n = pendingNotifications.find(x => x.code === code);
      if (n) markStatusSeen(n.code, n.status);
      pendingNotifications = pendingNotifications.filter(x => x.code !== code);
      card.remove();
      if (!banner.querySelector('.status-alert')) banner.remove();
      const b = $('#ordersBadgeMini');
      if (b && !pendingNotifications.length) {
        b.classList.remove('badge-alert');
        const u2 = UserDB.get();
        const cnt = OrderDB.getAll().filter(o => o.userEmail === u2?.email || !o.userEmail).length;
        b.textContent = cnt; b.hidden = !cnt;
      } else if (b) { b.textContent = pendingNotifications.length; }
    })
  );
}

// Vérifie l'avancement toutes les 2 minutes tant que l'espace est ouvert
setInterval(() => {
  if (UserDB.isLoggedIn() && !$('#dashboard').classList.contains('hidden')) {
    syncOrderStatusFromServer();
  }
}, 120000);

/* ============ COMMANDES ============ */
function renderOrders() {
  const u = UserDB.get(); if (!u) return;
  // On considere les commandes avec userEmail correspondant + les anciennes sans email
  const orders = OrderDB.getAll().filter(o => o.userEmail === u.email || !o.userEmail);
  const wrap = $('#ordersList');
  if (!orders.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <p>📦 Aucune commande pour le moment</p>
        <a href="index.html" class="btn">Découvrir la boutique</a>
      </div>`;
    return;
  }
  wrap.innerHTML = orders.map(o => {
    const date = new Date(o.date).toLocaleString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    const items = o.items
      ? o.items.map(it => `<li>${esc(it.productName)} — taille ${esc(it.size)} × ${it.qty}</li>`).join('')
      : (o.productName ? `<li>${esc(o.productName)} — taille ${esc(o.size)} × ${o.qty}</li>` : '');
    const cancelled = o.status === 'annulee';
    const cur = ORDER_STATUS_FLOW[orderStatusIndex(o.status)];
    const left = cancelWindowLeftMs(o);

    // Bandeau annulée / bloc modification-annulation / rien
    let controls = '';
    if (cancelled) {
      controls = `<p class="order-cancelled">🚫 Commande annulée</p>`;
    } else if (left > 0) {
      controls = `
        <div class="order-actions" data-cancel-deadline="${orderCreatedAt(o) + ORDER_CANCEL_WINDOW_MS}" data-code="${esc(o.pickupCode || '')}" data-oid="${o.id}">
          <p class="cancel-window">✏️ Modifiable ou annulable encore <strong class="cw-time">${formatDuration(left)}</strong></p>
          <div class="order-actions-btns">
            <button type="button" class="btn btn-outline btn-sm" data-order-act="modify">Modifier</button>
            <button type="button" class="btn-cancel" data-order-act="cancel">Annuler la commande</button>
          </div>
        </div>`;
    }

    const statusBadge = cancelled
      ? `<span class="order-status cancelled">🚫 Annulée</span>`
      : `<span class="order-status ${cur.id === 'retiree' ? 'envoyée' : ''}">${cur.icon} ${cur.label}</span>`;

    return `
      <article class="order-block ${cancelled ? 'is-cancelled' : ''}" id="order-${o.id}">
        <header class="order-block-head">
          <div>
            <strong>Commande #${o.id}</strong>
            <small>${date}</small>
          </div>
          ${statusBadge}
        </header>
        <ul class="order-block-items">${items}</ul>
        ${!cancelled && o.pickupCode ? `<p class="track-status-line" style="font-weight:700">🎫 Code de retrait : <strong>${esc(o.pickupCode)}</strong> — à présenter au boutique de Mamoudzou (rue du Commerce)</p>
        <img class="order-qr" alt="QR du code de retrait ${esc(o.pickupCode)}" src="/api/qr?data=${encodeURIComponent(o.pickupCode)}" width="130" height="130">` : ''}
        ${cancelled ? '' : clientTrackStepsHTML(o)}
        ${cancelled ? '' : `<p class="track-status-line">${cur.icon} <strong>${cur.label}</strong> — ${esc(cur.desc)}</p>`}
        <p class="order-pay-line">
          💳 Paiement : <strong>${esc(paymentLabel(o.payment))}</strong>${isPaidOnPickup(o.payment) && !cancelled ? ' <span class="order-pay-hint">— à régler au moment du retrait</span>' : ''}
        </p>
        ${controls}
        <footer class="order-block-foot">
          <span>🛍️ Retrait à la boutique, rue du Commerce</span>
          <strong>${esc(o.total || '')}</strong>
        </footer>
      </article>`;
  }).join('');

  // Masque proprement les QR si l'endpoint /api/qr n'est pas dispo
  wrap.querySelectorAll('.order-qr').forEach(img =>
    img.addEventListener('error', () => { img.style.display = 'none'; })
  );

  // Actions Modifier / Annuler
  wrap.querySelectorAll('[data-order-act]').forEach(btn =>
    btn.addEventListener('click', () => {
      const box = btn.closest('.order-actions');
      const o = orders.find(x => String(x.id) === box.dataset.oid);
      if (!o) return;
      if (btn.dataset.orderAct === 'cancel') cancelOrder(o);
      else modifyOrder(o);
    })
  );

  startCancelCountdowns();
}

/* ============ MODIFICATION / ANNULATION (fenêtre 6 h) ============ */
/** Annule la commande côté serveur (auth = code de retrait) */
async function serverCancel(pickupCode) {
  try {
    const r = await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientCancel: true, pickupCode })
    });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok && d.ok, error: d.error, status: r.status };
  } catch { return { ok: false, offline: true }; }
}

/** Marque la commande annulée dans le stockage local */
function setLocalCancelled(o) {
  const all = OrderDB.getAll();
  const l = all.find(x => x.id === o.id || (x.pickupCode && x.pickupCode === o.pickupCode));
  if (l) {
    l.status = 'annulee';
    l.statusHistory = [...(l.statusHistory || []), { status: 'annulee', date: Date.now(), by: 'client' }];
    OrderDB._save(all);
  }
}

/** true si on peut procéder (serveur OK, ou injoignable/absent → best effort local) */
function canProceedCancel(res) {
  return res.ok || res.offline || res.status === 404;
}

async function cancelOrder(o) {
  if (cancelWindowLeftMs(o) <= 0) { showToast('⏱️ Délai de 6 h dépassé'); renderOrders(); return; }
  if (!confirm('Annuler définitivement cette commande ?')) return;
  const res = await serverCancel(o.pickupCode);
  if (!canProceedCancel(res)) { showToast('❌ ' + (res.error || 'Annulation impossible')); renderOrders(); return; }
  setLocalCancelled(o);
  showToast('🚫 Commande annulée');
  renderOrders();
  if (typeof refreshAll === 'function') refreshAll();
}

async function modifyOrder(o) {
  if (cancelWindowLeftMs(o) <= 0) { showToast('⏱️ Délai de 6 h dépassé'); renderOrders(); return; }
  if (!confirm("Modifier cette commande ?\n\nElle sera annulée et ses articles remis dans ton panier pour que tu puisses la refaire.")) return;
  const res = await serverCancel(o.pickupCode);
  if (!canProceedCancel(res)) { showToast('❌ ' + (res.error || 'Modification impossible')); renderOrders(); return; }
  setLocalCancelled(o);
  (o.items || []).forEach(it => { if (it.productId) CartDB.add(it.productId, it.size, it.qty || 1); });
  showToast('🛒 Articles remis au panier');
  setTimeout(() => { location.href = 'index.html?panier=1'; }, 600);
}

/** Rafraîchit les comptes à rebours des fenêtres d'annulation */
let cancelTimer = null;
function startCancelCountdowns() {
  clearInterval(cancelTimer);
  if (!document.querySelector('[data-cancel-deadline]')) return;
  cancelTimer = setInterval(() => {
    let expired = false;
    document.querySelectorAll('[data-cancel-deadline]').forEach(box => {
      const left = Number(box.dataset.cancelDeadline) - Date.now();
      if (left <= 0) expired = true;
      else { const t = box.querySelector('.cw-time'); if (t) t.textContent = formatDuration(left); }
    });
    if (expired) renderOrders();
  }, 30000);
}

/** Stepper de suivi côté client (non cliquable, thème clair) */
function clientTrackStepsHTML(o) {
  const idx = orderStatusIndex(o.status);
  const hist = {};
  (o.statusHistory || []).forEach(h => { hist[h.status] = h.date; });
  const steps = ORDER_STATUS_FLOW.map((s, i) => {
    const cls = i < idx ? 'done' : (i === idx ? 'done current' : '');
    const dateStr = hist[s.id]
      ? new Date(hist[s.id]).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })
      : '';
    return `<div class="track-step ${cls}">
      <span class="track-dot">${s.icon}</span>
      <span class="track-label">${s.label}</span>
      <span class="track-date">${dateStr}</span>
    </div>`;
  }).join('');
  return `<div class="track-steps">${steps}</div>`;
}

/* ============ LIEN DE SUIVI (?track=) ============ */
(function handleTrackingLink() {
  const payload = new URLSearchParams(window.location.search).get('track');
  if (!payload) return;
  const o = OrderDB.applyTracking(payload);
  // Nettoie l'URL pour éviter une ré-application au refresh
  history.replaceState(null, '', window.location.pathname);
  if (!o) { showToast('❌ Lien de suivi invalide'); return; }
  const cur = ORDER_STATUS_FLOW[orderStatusIndex(o.status)];
  showToast(`📦 Suivi mis à jour : ${cur.icon} ${cur.label}`);
  if (UserDB.isLoggedIn() && UserDB.exists()) {
    // Ouvre l'onglet Mes commandes et scrolle vers la commande
    refreshAll();
    document.querySelector('.account-nav-item[data-pane="paneOrders"]')?.click();
    setTimeout(() => {
      document.getElementById('order-' + o.id)?.scrollIntoView({ behavior:'smooth', block:'center' });
    }, 250);
  }
})();

/* ============ MES INFOS ============ */
function fillInfoForm() {
  const u = UserDB.get(); if (!u) return;
  $('#infoName').value    = u.name    || '';
  $('#infoEmail').value   = u.email   || '';
  $('#infoPhone').value   = u.phone   || '';
  $('#infoAddress').value = u.address || '';
}
$('#infoForm').addEventListener('submit', e => {
  e.preventDefault();
  UserDB.updateProfile({
    name:    $('#infoName').value,
    email:   $('#infoEmail').value,
    phone:   $('#infoPhone').value,
    address: $('#infoAddress').value
  });
  showToast('✅ Informations mises à jour');
  refreshAll();
});

/* ============ SÉCURITÉ ============ */
$('#pwdForm').addEventListener('submit', async e => {
  e.preventDefault();
  const oldP = $('#oldPwd').value;
  const newP = $('#newPwd').value;
  const conf = $('#newPwdConfirm').value;
  const msg  = $('#pwdMsg');
  if (newP !== conf) { msg.textContent = '❌ Les deux nouveaux mots de passe ne correspondent pas.'; msg.className = 'pane-msg bad'; return; }
  const r = await UserDB.changePassword(oldP, newP);
  if (r.ok) {
    msg.textContent = '✅ Mot de passe changé avec succès.';
    msg.className = 'pane-msg ok';
    $('#pwdForm').reset();
    showToast('🔐 Mot de passe mis à jour');
  } else {
    msg.textContent = '❌ ' + r.error;
    msg.className = 'pane-msg bad';
  }
});

$('#deleteAccountBtn').addEventListener('click', () => {
  if (!confirm("⚠️ Confirmer la suppression définitive de ton compte ?\n\nTon historique de commandes locales et tes infos seront effacés.")) return;
  UserDB.deleteAccount();
  showToast('🗑️ Compte supprimé');
  showAuth();
});

/* ============ NOTER LE SITE ============ */
let currentStars = 0;
const stars  = $$('#ratingStars button');
const submitBtn = $('#ratingSubmit');

function paintStars(n) {
  stars.forEach(s => {
    const v = parseInt(s.dataset.star, 10);
    s.classList.toggle('filled', v <= n);
  });
}
function ratingLabelFor(n) {
  return ['Glisse sur les étoiles puis clique pour valider','Décevant','Pas top','Correct','Très bien','Excellent !'][n] || '';
}

function initRating() {
  const u = UserDB.get();
  if (u && u.rating) {
    currentStars = u.rating.stars;
    paintStars(currentStars);
    $('#ratingLabel').textContent = `Ta note : ${ratingLabelFor(currentStars)} (${currentStars}/5)`;
    $('#ratingComment').value = u.rating.comment || '';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Modifier mon avis';
  } else {
    currentStars = 0;
    paintStars(0);
    $('#ratingLabel').textContent = ratingLabelFor(0);
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoyer mon avis';
  }
}

stars.forEach(s => {
  const v = parseInt(s.dataset.star, 10);
  s.addEventListener('mouseenter', () => paintStars(v));
  s.addEventListener('mouseleave', () => paintStars(currentStars));
  s.addEventListener('click', () => {
    currentStars = v;
    paintStars(v);
    $('#ratingLabel').textContent = ratingLabelFor(v);
    submitBtn.disabled = false;
  });
});

$('#ratingForm').addEventListener('submit', e => {
  e.preventDefault();
  if (!currentStars) return;
  const comment = $('#ratingComment').value.trim();
  UserDB.saveRating(currentStars, comment);
  $('#ratingMsg').textContent = '✅ Merci pour ton avis !';
  $('#ratingMsg').className = 'pane-msg ok';
  showToast('⭐ Merci pour ta note');
  initRating();
});
