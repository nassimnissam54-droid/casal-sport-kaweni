/* ============================================================
   CASAL SPORT — Compte client (script)
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

if (UserDB.isLoggedIn() && UserDB.exists()) {
  showDashboard();
} else {
  showAuth();
}

/* ============ AUTH TABS ============ */
$$('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    $('#loginForm').hidden  = target !== 'login';
    $('#signupForm').hidden = target !== 'signup';
  });
});
$$('.auth-switch a').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = a.dataset.go;
    $$('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === target));
    $('#loginForm').hidden  = target !== 'login';
    $('#signupForm').hidden = target !== 'signup';
  });
});

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
  $('#profileGifts').textContent = UserDB.giftCardsTotal().toFixed(2).replace('.', ',') + ' €';
  // Badges mini
  const ob = $('#ordersBadgeMini');
  if (orders.length) { ob.textContent = orders.length; ob.hidden = false; } else { ob.hidden = true; }
  const gb = $('#giftsBadgeMini');
  const nbGifts = (u.giftCards || []).filter(g => !g.used).length;
  if (nbGifts) { gb.textContent = nbGifts; gb.hidden = false; } else { gb.hidden = true; }
  // Sections individuelles
  renderOrders();
  fillInfoForm();
  renderGifts();
  initRating();
}

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
    const cur = ORDER_STATUS_FLOW[orderStatusIndex(o.status)];
    return `
      <article class="order-block" id="order-${o.id}">
        <header class="order-block-head">
          <div>
            <strong>Commande #${o.id}</strong>
            <small>${date}</small>
          </div>
          <span class="order-status ${cur.id === 'retiree' ? 'envoyée' : ''}">${cur.icon} ${cur.label}</span>
        </header>
        <ul class="order-block-items">${items}</ul>
        ${o.pickupCode ? `<p class="track-status-line" style="font-weight:700">🎫 Code de retrait : <strong>${esc(o.pickupCode)}</strong> — à présenter au magasin de Kawéni</p>` : ''}
        ${clientTrackStepsHTML(o)}
        <p class="track-status-line">${cur.icon} <strong>${cur.label}</strong> — ${esc(cur.desc)}</p>

        <footer class="order-block-foot">
          <span>🛍️ Retrait au magasin de Kawéni</span>
          <strong>${esc(o.total || '')}</strong>
        </footer>
      </article>`;
  }).join('');
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

/* ============ CARTES CADEAUX ============ */
function renderGifts() {
  const u = UserDB.get(); if (!u) return;
  const list = u.giftCards || [];
  $('#giftsTotalAmount').textContent = UserDB.giftCardsTotal().toFixed(2).replace('.', ',') + ' €';
  const wrap = $('#giftsList');
  if (!list.length) {
    wrap.innerHTML = `<div class="empty-state"><p>🎁 Aucune carte cadeau pour l'instant</p><p class="muted">Saisis un code ci-dessus pour activer ta première carte.</p></div>`;
    return;
  }
  wrap.innerHTML = list.map(g => `
    <div class="gift-card ${g.used ? 'used' : ''}">
      <div>
        <div class="gift-code">${esc(g.code)}</div>
        <small>Ajoutée le ${new Date(g.addedAt).toLocaleDateString('fr-FR')}</small>
      </div>
      <div class="gift-amount">${g.amount.toFixed(2).replace('.', ',')} €</div>
      <span class="gift-status">${g.used ? 'Utilisée' : 'Disponible'}</span>
    </div>
  `).join('');
}

$('#giftForm').addEventListener('submit', e => {
  e.preventDefault();
  const code = $('#giftCode').value.trim().toUpperCase();
  const msg = $('#giftMsg');
  if (!code) return;
  const amount = VALID_GIFT_CARDS[code];
  if (!amount) {
    msg.textContent = '❌ Code invalide ou expiré.';
    msg.className = 'pane-msg bad';
    return;
  }
  const ok = UserDB.addGiftCard(code, amount);
  if (!ok) {
    msg.textContent = '⚠ Cette carte est déjà activée sur ton compte.';
    msg.className = 'pane-msg bad';
    return;
  }
  msg.textContent = `✅ Carte ${code} de ${amount} € activée !`;
  msg.className = 'pane-msg ok';
  $('#giftCode').value = '';
  renderGifts();
  refreshAll();
  showToast(`🎁 +${amount} € sur ton compte`);
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
