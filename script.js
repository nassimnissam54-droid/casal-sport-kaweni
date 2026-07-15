/* ============================================================
   CASAL SPORT — Script public (avec panier multi-articles)
   ============================================================ */

/* ============ MENU MOBILE OVERLAY ============ */
const burger      = document.getElementById('burger');
const menuOverlay = document.getElementById('menuOverlay');
const menuClose   = document.getElementById('menuClose');

burger?.addEventListener('click', () => menuOverlay?.classList.add('open'));
menuClose?.addEventListener('click', () => menuOverlay?.classList.remove('open'));
menuOverlay?.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => menuOverlay.classList.remove('open'))
);

/* ============ MEGA MENU ============ */
const megaItems = document.querySelectorAll('.category-item[data-mega]');
const allMegas  = document.querySelectorAll('.mega-menu');
const categoryNav = document.querySelector('.category-nav');

function closeAllMegas() { allMegas.forEach(m => m.classList.remove('open')); }
megaItems.forEach(item => {
  item.addEventListener('mouseenter', () => {
    closeAllMegas();
    const mega = document.getElementById(item.dataset.mega);
    if (mega) mega.classList.add('open');
  });
});
categoryNav?.addEventListener('mouseleave', closeAllMegas);
allMegas.forEach(m => m.addEventListener('mouseleave', () => m.classList.remove('open')));

/* ============ ETAT FILTRES (multi-dimensionnel) ============ */
const filterState = {
  'grid-vet': { type:'vetement', cats:[], subs:[], prices:[], inStock:false, promo:false, news:false, q:'', sort:'new' },
  'grid-bas': { type:'basket',   cats:[], subs:[], prices:[], inStock:false, promo:false, news:false, q:'', sort:'new' }
};

const SORT_LABELS = {
  'new':        'Nouveautés',
  'price-asc':  'Prix : croissant',
  'price-desc': 'Prix : décroissant',
  'name':       'Nom : A → Z',
  'rating':     'Mieux notés'
};

function filterList(state) {
  let list = ProductDB.getLive().filter(p => p.type === state.type);
  if (state.cats.length)   list = list.filter(p => state.cats.includes(p.cat));
  if (state.subs && state.subs.length) list = list.filter(p => state.subs.includes(p.sub));
  if (state.prices.length) {
    list = list.filter(p => state.prices.some(r => {
      const [min, max] = r.split('-').map(Number);
      return p.price >= min && p.price < max;
    }));
  }
  if (state.inStock) list = list.filter(p => p.stock !== 'out');
  if (state.promo)   list = list.filter(p => p.oldPrice);
  if (state.news)    list = list.filter(p => ProductDB.isNew(p));
  if (state.q) {
    const q = state.q.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.desc && p.desc.toLowerCase().includes(q)) ||
      (p.material && p.material.toLowerCase().includes(q))
    );
  }
  switch (state.sort) {
    case 'price-asc':  list.sort((a,b) => a.price - b.price); break;
    case 'price-desc': list.sort((a,b) => b.price - a.price); break;
    case 'name':       list.sort((a,b) => a.name.localeCompare(b.name)); break;
    case 'rating':     list.sort((a,b) => (ReviewDB.averageRating(b.id, b.rating)||0) - (ReviewDB.averageRating(a.id, a.rating)||0)); break;
    default:           list.sort((a,b) => (b.createdAt||b.id) - (a.createdAt||a.id));
  }
  return list;
}

function applyFilter(id) {
  const s = filterState[id];
  const list = filterList(s);
  renderGrid(id, list);
  const suffix = id === 'grid-vet' ? 'Vet' : 'Bas';
  const countEl = document.getElementById('count' + suffix);
  if (countEl) countEl.textContent = `${list.length} article${list.length > 1 ? 's' : ''}`;
  // Mise à jour des indicateurs filtres / tri
  renderActiveFilters(id);
  updateFilterBadge(id);
  updateSortLabel(id);
}

/* ============ ACTIVE FILTERS PILLS ============ */
const FILTER_LABELS = {
  homme:'Homme', femme:'Femme', garcon:'Garçon', fille:'Fille', mixte:'Mixte / Équipement',
  tshirt:'Tee-shirt', ensemble:'Ensemble', casquette:'Casquette',
  short:'Short', chaussettes:'Chaussettes', basket:'Basket', equipement:'Équipement',
  '0-30':'< 30 €', '30-60':'30–60 €', '60-100':'60–100 €', '100-9999':'> 100 €',
  inStock:'En stock', promo:'En promo', news:'Nouveautés'
};

function activeFiltersOf(state) {
  const out = [];
  state.cats.forEach(c => out.push({ key:'cats', val:c, label:FILTER_LABELS[c] || c }));
  (state.subs || []).forEach(s => out.push({ key:'subs', val:s, label:FILTER_LABELS[s] || s }));
  state.prices.forEach(p => out.push({ key:'prices', val:p, label:FILTER_LABELS[p] || p }));
  if (state.inStock) out.push({ key:'inStock', val:true, label:FILTER_LABELS.inStock });
  if (state.promo)   out.push({ key:'promo',   val:true, label:FILTER_LABELS.promo });
  if (state.news)    out.push({ key:'news',    val:true, label:FILTER_LABELS.news });
  return out;
}

function renderActiveFilters(id) {
  const suffix = id === 'grid-vet' ? 'Vet' : 'Bas';
  const wrap = document.getElementById('activeFilters' + suffix);
  if (!wrap) return;
  const s = filterState[id];
  const pills = activeFiltersOf(s);
  if (!pills.length) { wrap.hidden = true; wrap.innerHTML = ''; return; }
  wrap.hidden = false;
  wrap.innerHTML = pills.map(p =>
    `<span class="filter-pill">${esc(p.label)} <button data-rm-key="${p.key}" data-rm-val="${esc(String(p.val))}" aria-label="Retirer ${esc(p.label)}">×</button></span>`
  ).join('') + `<button class="filters-clear" data-clear="${id}">Tout effacer</button>`;

  wrap.querySelectorAll('[data-rm-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.rmKey;
      const v = btn.dataset.rmVal;
      if (Array.isArray(s[k])) {
        s[k] = s[k].filter(x => x !== v);
      } else {
        s[k] = false;
      }
      applyFilter(id);
    });
  });
  wrap.querySelector('[data-clear]')?.addEventListener('click', () => resetFilters(id));
}

function countActiveFilters(state) {
  return state.cats.length + (state.subs || []).length + state.prices.length
    + (state.inStock ? 1 : 0) + (state.promo ? 1 : 0) + (state.news ? 1 : 0);
}

function updateFilterBadge(id) {
  const suffix = id === 'grid-vet' ? 'Vet' : 'Bas';
  const badge = document.getElementById('filterCount' + suffix);
  if (!badge) return;
  const n = countActiveFilters(filterState[id]);
  if (n > 0) { badge.textContent = n; badge.hidden = false; }
  else       { badge.hidden = true; }
}

function updateSortLabel(id) {
  const suffix = id === 'grid-vet' ? 'Vet' : 'Bas';
  const lbl = document.getElementById('sortLabel' + suffix);
  if (lbl) lbl.textContent = ': ' + SORT_LABELS[filterState[id].sort];
}

function resetFilters(id) {
  const s = filterState[id];
  s.cats = []; s.subs = []; s.prices = []; s.inStock = false; s.promo = false; s.news = false;
  applyFilter(id);
}

function renderGrid(gridId, list) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = list.length
    ? list.map(cardHTML).join('')
    : `<p style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--gris-600);letter-spacing:.1em;text-transform:uppercase;font-size:.8rem">Aucun produit trouvé.</p>`;
  bindCardActions(grid);
}

/* ============ CARTE PRODUIT ============ */
function cardHTML(p) {
  const isNew = ProductDB.isNew(p);
  const badges = [];
  if (p.badge && p.badge.startsWith('-')) badges.push(`<span class="card-badge sale">${esc(p.badge)}</span>`);
  else if (p.badge)                       badges.push(`<span class="card-badge">${esc(p.badge)}</span>`);
  if (isNew && !p.badge)                  badges.push(`<span class="card-badge new">Nouveau</span>`);
  if (p.stock === 'out')                  badges.push(`<span class="card-badge out">Épuisé</span>`);

  const isFav = WishlistDB.has(p.id);

  const imgHTML = p.imageUrl
    ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}" class="card-photo" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <div class="product-icon-fb" style="display:none;--c1:${p.color1};--c2:${p.color2}">${p.icon}</div>`
    : `<div class="product-icon-fb" style="--c1:${p.color1};--c2:${p.color2}">${p.icon}</div>`;

  let stockStrip = '';
  if (p.stock === 'low') stockStrip = `<div class="stock-strip low">Plus que quelques pièces</div>`;
  if (p.stock === 'out') stockStrip = `<div class="stock-strip out">Indisponible</div>`;

  const orderDisabled = p.stock === 'out' ? 'disabled' : '';
  const orderLabel    = p.stock === 'out' ? 'Épuisé' : '🛒 + Ajouter au panier';

  const avg = ReviewDB.averageRating(p.id, p.rating);
  const cnt = ReviewDB.forProduct(p.id).length;
  const ratingHTML = avg
    ? `<div class="card-rating"><span class="stars">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5-Math.round(avg))}</span> ${cnt ? `(${cnt})` : ''}</div>`
    : '';

  const oldPrice = p.oldPrice ? `<span class="card-old-price">${p.oldPrice.toFixed(2)} €</span>` : '';
  const priceClass = p.oldPrice ? 'card-price sale' : 'card-price';

  return `
  <article class="card" data-cat="${p.cat}" data-id="${p.id}">
    <div class="card-img-wrap">
      ${imgHTML}
      <div class="card-badges">${badges.join('')}</div>
      <button class="fav-icon ${isFav ? 'active' : ''}" data-fav="${p.id}" aria-label="Favori">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <button class="share-icon" data-share-id="${p.id}" aria-label="Partager">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      </button>
      ${stockStrip}
      <button class="quick-add" data-id="${p.id}" ${orderDisabled}>${orderLabel}</button>
    </div>
    <div class="card-body">
      <span class="card-cat">${labelOf(p.cat)} · ${SUB_LABELS[p.sub] || (p.type === 'basket' ? 'Basket' : 'Textile &amp; Équip.')}</span>
      <h3 class="card-name">${esc(p.name)}</h3>
      ${ratingHTML}
      <div class="card-prices">
        <span class="${priceClass}">${p.price.toFixed(2)} €</span>
        ${oldPrice}
      </div>
    </div>
  </article>`;
}

function bindCardActions(scope) {
  // "+ Ajouter au panier" → ouvre le size picker
  scope.querySelectorAll('.quick-add:not([disabled])').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openSizePicker(parseInt(btn.dataset.id, 10));
    });
  });

  // Favoris
  scope.querySelectorAll('.fav-icon').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const id = parseInt(btn.dataset.fav, 10);
      const nowFav = WishlistDB.toggle(id);
      btn.classList.toggle('active', nowFav);
      btn.classList.add('pulse');
      setTimeout(() => btn.classList.remove('pulse'), 450);
      updateFavCounter();
      renderFavorites();
      document.querySelectorAll(`.fav-icon[data-fav="${id}"]`).forEach(b => b.classList.toggle('active', nowFav));
      showToast(nowFav ? '♥ Ajouté à tes favoris' : '♡ Retiré des favoris');
    });
  });

  // Click photo → lightbox
  scope.querySelectorAll('.card-photo').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', e => {
      e.stopPropagation();
      openLightbox(img.src);
    });
  });

  // Click share icon → ouvre le popover
  scope.querySelectorAll('.share-icon').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openSharePopover(btn, parseInt(btn.dataset.shareId, 10));
    });
  });
}

function labelOf(c) { return { homme:'Homme', femme:'Femme', garcon:'Garçon', fille:'Fille', mixte:'Mixte' }[c] || c; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* ============ RECHERCHE ============ */
document.getElementById('searchVet')?.addEventListener('input', e => { filterState['grid-vet'].q = e.target.value; applyFilter('grid-vet'); });
document.getElementById('searchBas')?.addEventListener('input', e => { filterState['grid-bas'].q = e.target.value; applyFilter('grid-bas'); });
document.getElementById('searchToggle')?.addEventListener('click', () => {
  const input = document.getElementById('searchVet');
  if (input) { input.focus(); input.scrollIntoView({ behavior:'smooth', block:'center' }); }
});

/* ============ TOOLBAR BUTTONS (Filtrer / Trier) ============ */
document.querySelectorAll('.toolbar-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    const action = btn.dataset.action;
    const target = btn.dataset.target;
    if (action === 'filter') openFilterDrawer(target);
    if (action === 'sort')   openSortSheet(btn, target);
  });
});

/* ============ FILTER DRAWER ============ */
const filterDrawer  = document.getElementById('filterDrawer');
const filterOverlay = document.getElementById('filterOverlay');
let filterDrawerTarget = null;

function openFilterDrawer(targetId) {
  filterDrawerTarget = targetId;
  syncDrawerInputs();
  updateApplyCount();
  filterDrawer.classList.add('open');
  filterOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeFilterDrawer() {
  filterDrawer.classList.remove('open');
  filterOverlay.classList.remove('show');
  document.body.style.overflow = '';
  filterDrawerTarget = null;
}
document.getElementById('filterClose').addEventListener('click', closeFilterDrawer);
filterOverlay.addEventListener('click', closeFilterDrawer);

/** Synchronise les cases du drawer avec l'état actuel du target */
function syncDrawerInputs() {
  if (!filterDrawerTarget) return;
  const s = filterState[filterDrawerTarget];
  filterDrawer.querySelectorAll('input[data-fkey]').forEach(input => {
    const k = input.dataset.fkey;
    const v = input.value;
    if (Array.isArray(s[k])) input.checked = s[k].includes(v);
    else                      input.checked = !!s[k];
  });
}

/** Mise à jour live du compteur "Voir X articles" pendant la sélection */
function updateApplyCount() {
  if (!filterDrawerTarget) return;
  // Construit un état temporaire à partir des cases cochées du drawer
  const base = filterState[filterDrawerTarget];
  const tmp = { ...base, cats:[], subs:[], prices:[], inStock:false, promo:false, news:false };
  filterDrawer.querySelectorAll('input[data-fkey]:checked').forEach(input => {
    const k = input.dataset.fkey;
    if (Array.isArray(tmp[k])) tmp[k].push(input.value);
    else                        tmp[k] = true;
  });
  const list = filterList(tmp);
  document.getElementById('filterApplyCount').textContent = list.length;
}

filterDrawer.querySelectorAll('input[data-fkey]').forEach(input => {
  input.addEventListener('change', updateApplyCount);
});

document.getElementById('filterApply').addEventListener('click', () => {
  if (!filterDrawerTarget) { closeFilterDrawer(); return; }
  const s = filterState[filterDrawerTarget];
  s.cats = []; s.subs = []; s.prices = []; s.inStock = false; s.promo = false; s.news = false;
  filterDrawer.querySelectorAll('input[data-fkey]:checked').forEach(input => {
    const k = input.dataset.fkey;
    if (Array.isArray(s[k])) s[k].push(input.value);
    else                      s[k] = true;
  });
  applyFilter(filterDrawerTarget);
  closeFilterDrawer();
});

document.getElementById('filterReset').addEventListener('click', () => {
  filterDrawer.querySelectorAll('input[data-fkey]').forEach(input => input.checked = false);
  updateApplyCount();
});

/* ============ SORT SHEET ============ */
const sortSheet = document.getElementById('sortSheet');
let sortSheetTarget = null;

function openSortSheet(btn, targetId) {
  sortSheetTarget = targetId;
  // Position sous le bouton
  const r = btn.getBoundingClientRect();
  sortSheet.style.top  = `${r.bottom + 4}px`;
  sortSheet.style.left = `${Math.max(8, r.right - 240)}px`;
  // État actif
  const cur = filterState[targetId].sort;
  sortSheet.querySelectorAll('button').forEach(b => {
    b.classList.toggle('active', b.dataset.sort === cur);
  });
  sortSheet.hidden = false;
}
function closeSortSheet() {
  sortSheet.hidden = true;
  sortSheetTarget = null;
}
sortSheet.querySelectorAll('button').forEach(b => {
  b.addEventListener('click', () => {
    if (!sortSheetTarget) return;
    filterState[sortSheetTarget].sort = b.dataset.sort;
    applyFilter(sortSheetTarget);
    closeSortSheet();
  });
});
document.addEventListener('click', e => {
  if (sortSheet.hidden) return;
  if (sortSheet.contains(e.target)) return;
  if (e.target.closest('[data-action="sort"]')) return;
  closeSortSheet();
});
window.addEventListener('scroll', () => { if (!sortSheet.hidden) closeSortSheet(); }, { passive: true });
window.addEventListener('resize', () => { if (!sortSheet.hidden) closeSortSheet(); });

/* ============ NOUVEAUTÉS (carrousel) ============ */
function renderCarousel() {
  const car = document.getElementById('carouselNew');
  if (!car) return;
  car.innerHTML = ProductDB.newest(10).map(cardHTML).join('');
  bindCardActions(car);
}
document.getElementById('carouselPrev')?.addEventListener('click', () => document.getElementById('carouselNew').scrollBy({ left: -540, behavior: 'smooth' }));
document.getElementById('carouselNext')?.addEventListener('click', () => document.getElementById('carouselNew').scrollBy({ left: 540, behavior: 'smooth' }));

/* ============ FAVORIS ============ */
function updateFavCounter() {
  const c = document.getElementById('favCounter');
  const mb = document.getElementById('mobileFavBadge');
  const n = WishlistDB.count();
  if (c)  c.textContent  = n;
  if (mb) { mb.textContent = n; mb.hidden = n === 0; }
}
function renderFavorites() {
  const grid = document.getElementById('grid-fav');
  const sub  = document.getElementById('favSubtitle');
  if (!grid) return;
  const ids = WishlistDB.getAll();
  const list = ProductDB.getLive().filter(p => ids.includes(p.id));
  if (!list.length) {
    if (sub) sub.textContent = "Aucun favori — clique sur le ♡ d'un produit pour l'ajouter.";
    grid.innerHTML = '';
    return;
  }
  if (sub) sub.textContent = `${list.length} produit${list.length > 1 ? 's' : ''} sauvegardé${list.length > 1 ? 's' : ''}`;
  grid.innerHTML = list.map(cardHTML).join('');
  bindCardActions(grid);
}

/* ============================================================
   SIZE PICKER MODAL (étape 1 : choisir taille avant ajout panier)
   ============================================================ */
const sizePickerModal   = document.getElementById('sizePickerModal');
const sizePickerProduct = document.getElementById('sizePickerProduct');
const sizePickerOptions = document.getElementById('sizePickerOptions');
const sizePickerAddBtn  = document.getElementById('sizePickerAdd');
let selectedSizeProduct = null;

function openSizePicker(productId) {
  const p = ProductDB.getAll().find(x => x.id === productId);
  if (!p || p.stock === 'out') return;
  selectedSizeProduct = p;

  const imgHTML = p.imageUrl
    ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}">`
    : `<div style="display:flex;align-items:center;justify-content:center;font-size:2rem">${p.icon}</div>`;
  sizePickerProduct.innerHTML = `
    <div class="modal-thumb" style="background:linear-gradient(135deg,${p.color1},${p.color2})">${imgHTML}</div>
    <div class="modal-info">
      <span class="card-cat">${labelOf(p.cat)}</span>
      <h3>${esc(p.name)}</h3>
      <p class="modal-price">${p.price.toFixed(2)} €</p>
    </div>`;

  const sizes = String(p.sizes).split(/[—,/]+/).map(s => s.trim()).filter(Boolean);
  const opts  = sizes.length ? sizes : ['Unique'];
  sizePickerOptions.innerHTML = opts.map((s, i) =>
    `<button type="button" class="size-btn ${i === 0 ? 'active' : ''}" data-size="${esc(s)}">${esc(s)}</button>`
  ).join('');
  sizePickerOptions.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sizePickerOptions.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  sizePickerModal.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeSizePicker() {
  sizePickerModal.hidden = true;
  document.body.style.overflow = '';
  selectedSizeProduct = null;
}
document.getElementById('sizePickerClose').addEventListener('click', closeSizePicker);
sizePickerModal.addEventListener('click', e => { if (e.target === sizePickerModal) closeSizePicker(); });

sizePickerAddBtn.addEventListener('click', () => {
  if (!selectedSizeProduct) return;
  const activeSize = sizePickerOptions.querySelector('.size-btn.active');
  if (!activeSize) { showToast('⚠ Choisis une taille'); return; }
  const size = activeSize.dataset.size;
  CartDB.add(selectedSizeProduct.id, size, 1);
  updateCartCounter();
  const productName = selectedSizeProduct.name;
  closeSizePicker();
  showToast(`🛒 Ajouté : ${productName} (${size})`);
  // Petite animation du compteur header
  const cc = document.getElementById('cartCounter');
  if (cc) {
    cc.style.transform = 'scale(1.4)';
    setTimeout(() => cc.style.transform = '', 250);
  }
});

/* ============================================================
   CART DRAWER (tiroir panier)
   ============================================================ */
const cartDrawer   = document.getElementById('cartDrawer');
const cartOverlay  = document.getElementById('cartOverlay');
const cartItemsEl  = document.getElementById('cartItems');

function openCartDrawer() {
  renderCart();
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeCartDrawer() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('show');
  document.body.style.overflow = '';
}
document.getElementById('cartToggle')?.addEventListener('click', e => { e.preventDefault(); openCartDrawer(); });
document.getElementById('cartToggleMobile')?.addEventListener('click', e => { e.preventDefault(); openCartDrawer(); });
document.getElementById('cartClose').addEventListener('click', closeCartDrawer);
cartOverlay.addEventListener('click', closeCartDrawer);

function renderCart() {
  const items = CartDB.getDetailed();
  document.getElementById('cartCountTitle').textContent = CartDB.count();
  document.getElementById('cartSubtotal').textContent = CartDB.total().toFixed(2).replace('.', ',') + ' €';
  const checkout = document.getElementById('cartCheckout');

  if (!items.length) {
    cartItemsEl.innerHTML = `
      <div class="cart-empty">
        <div class="big">🛒</div>
        <p><strong>Ton panier est vide</strong></p>
        <p>Découvre nos articles et ajoute tes coups de cœur.</p>
        <button class="btn" data-go-catalog>Voir le catalogue</button>
      </div>`;
    cartItemsEl.querySelector('[data-go-catalog]')?.addEventListener('click', () => {
      closeCartDrawer();
      document.getElementById('vetements').scrollIntoView({ behavior: 'smooth' });
    });
    if (checkout) checkout.disabled = true;
    return;
  }

  if (checkout) checkout.disabled = false;

  cartItemsEl.innerHTML = items.map(({ product: p, size, qty }) => {
    const img = p.imageUrl
      ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}">`
      : `<div class="fb" style="background:linear-gradient(135deg,${p.color1},${p.color2})">${p.icon}</div>`;
    return `
      <div class="cart-item" data-pid="${p.id}" data-size="${esc(size)}">
        <div class="cart-item-img">${img}</div>
        <div class="cart-item-info">
          <div class="name">${esc(p.name)}</div>
          <div class="meta">${esc(size)} · ${labelOf(p.cat)}</div>
          <div class="cart-qty">
            <button data-action="dec" aria-label="Diminuer">−</button>
            <input type="number" value="${qty}" min="1" max="99" data-input>
            <button data-action="inc" aria-label="Augmenter">+</button>
          </div>
        </div>
        <div class="cart-item-price">
          <span class="price">${(p.price * qty).toFixed(2)} €</span>
          <button class="remove" data-action="remove">Retirer</button>
        </div>
      </div>`;
  }).join('');

  cartItemsEl.querySelectorAll('.cart-item').forEach(itemEl => {
    const pid = parseInt(itemEl.dataset.pid, 10);
    const size = itemEl.dataset.size;
    const refreshAfter = () => { renderCart(); updateCartCounter(); };
    itemEl.querySelector('[data-action="dec"]')?.addEventListener('click', () => {
      const cur = CartDB.getAll().find(i => i.productId === pid && i.size === size);
      if (cur) CartDB.setQty(pid, size, cur.qty - 1);
      refreshAfter();
    });
    itemEl.querySelector('[data-action="inc"]')?.addEventListener('click', () => {
      const cur = CartDB.getAll().find(i => i.productId === pid && i.size === size);
      if (cur) CartDB.setQty(pid, size, cur.qty + 1);
      refreshAfter();
    });
    itemEl.querySelector('[data-input]')?.addEventListener('change', e => {
      const v = parseInt(e.target.value, 10) || 1;
      CartDB.setQty(pid, size, v);
      refreshAfter();
    });
    itemEl.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
      CartDB.remove(pid, size);
      refreshAfter();
      showToast('Article retiré du panier');
    });
  });
}

function updateCartCounter() {
  const n = CartDB.count();
  const c = document.getElementById('cartCounter');
  if (c) { c.textContent = n; c.hidden = n === 0; }
  const mb = document.getElementById('mobileCartBadge');
  if (mb) { mb.textContent = n; mb.hidden = n === 0; }
}
window.closeCartDrawer = closeCartDrawer;

/* ============ CHECKOUT (panier → modal commande) ============ */
const orderModal     = document.getElementById('orderModal');
const orderForm      = document.getElementById('orderForm');
const orderTotalEl   = document.getElementById('orderTotal');
const orderPromo     = document.getElementById('orderPromo');
const promoMsg       = document.getElementById('promoMsg');
const orderCartSum   = document.getElementById('orderCartSummary');
let appliedPromo = null;

document.getElementById('cartCheckout').addEventListener('click', () => {
  if (CartDB.count() === 0) { showToast('🛒 Ton panier est vide'); return; }
  closeCartDrawer();
  openCheckoutModal();
});

/* ============ MODES DE PAIEMENT ============ */
const payMethodsWrap = document.getElementById('payMethods');
const orderPayment   = document.getElementById('orderPayment');

/* Icônes SVG des modes de paiement (l'emoji de PAYMENT_CONFIG reste
   utilisé dans le message WhatsApp, plus lisible en texte brut) */
const PAY_SVG = {
  'online-card': 'i-card', 'card-onsite': 'i-terminal',
  'cash': 'i-cash', 'transfer': 'i-bank',
};

function renderPayMethods() {
  if (!payMethodsWrap) return;
  payMethodsWrap.innerHTML = PAYMENT_CONFIG.methods.map(m => `
    <label class="pay-method" data-pay="${m.id}">
      <input type="radio" name="payMethod" value="${m.id}" />
      <span class="pay-method-icon"><svg class="icon"><use href="#${PAY_SVG[m.id] || 'i-card'}"/></svg></span>
      <span class="pay-method-txt">
        <strong>${esc(m.label)}</strong>
        <small>${esc(m.desc)}</small>
      </span>
    </label>
  `).join('');
  payMethodsWrap.querySelectorAll('input[name="payMethod"]').forEach(input => {
    input.addEventListener('change', () => {
      orderPayment.value = input.value;
      payMethodsWrap.querySelectorAll('.pay-method').forEach(l =>
        l.classList.toggle('selected', l.dataset.pay === input.value)
      );
    });
  });
}
renderPayMethods();

function paymentLabelOf(id) {
  const m = PAYMENT_CONFIG.methods.find(x => x.id === id);
  return m ? `${m.icon} ${m.label}` : id;
}

function openCheckoutModal() {
  // Réinitialise l'état (l'écran de confirmation a pu remplacer le formulaire)
  orderForm.hidden = false;
  orderCartSum.hidden = false;
  document.getElementById('orderSuccess').hidden = true;
  orderModal.querySelector('h2').textContent = 'Finaliser ma commande';
  orderModal.querySelector('.modal-sub').innerHTML =
    'Vérifie ton panier et remplis tes coordonnées — tu recevras ton <strong>code de retrait</strong> à présenter au magasin de Kawéni.';
  renderCartSummary();
  orderForm.reset();
  appliedPromo = null;
  promoMsg.textContent = '';
  promoMsg.className = 'promo-msg';
  // Réinitialise la sélection de paiement
  orderPayment.value = '';
  payMethodsWrap?.querySelectorAll('.pay-method').forEach(l => l.classList.remove('selected'));
  updateOrderTotal();
  // Pre-remplir si l'utilisateur est connecte
  if (typeof UserDB !== 'undefined' && UserDB.isLoggedIn()) {
    const u = UserDB.get();
    if (u) {
      const n = document.getElementById('orderName');   if (n && !n.value) n.value = u.name || '';
      const p = document.getElementById('orderPhone');  if (p && !p.value) p.value = u.phone || '';
      const e = document.getElementById('orderEmail');  if (e && !e.value) e.value = u.email || '';
      const d = document.getElementById('orderDetails');if (d && !d.value && u.address) d.value = u.address;
    }
  }
  orderModal.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeOrderModal() {
  orderModal.hidden = true;
  document.body.style.overflow = '';
}
document.getElementById('modalClose').addEventListener('click', closeOrderModal);
orderModal.addEventListener('click', e => { if (e.target === orderModal) closeOrderModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!orderModal.hidden) closeOrderModal();
    if (!sizePickerModal.hidden) closeSizePicker();
    if (cartDrawer.classList.contains('open')) closeCartDrawer();
  }
});

function renderCartSummary() {
  const items = CartDB.getDetailed();
  orderCartSum.innerHTML = items.map(({ product: p, size, qty }) => {
    const img = p.imageUrl
      ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}">`
      : `<span>${p.icon}</span>`;
    return `
      <div class="cart-summary-item">
        <div class="img-wrap" style="background:linear-gradient(135deg,${p.color1},${p.color2})">${img}</div>
        <div>
          <div class="info-name">${esc(p.name)}</div>
          <div class="info-meta">${esc(size)} · Qty ${qty}</div>
        </div>
        <div class="line-price">${(p.price * qty).toFixed(2)} €</div>
      </div>`;
  }).join('');
}

function updateOrderTotal() {
  let total = CartDB.total();
  if (appliedPromo) {
    if (appliedPromo.type === 'percent') total *= (1 - appliedPromo.value / 100);
    else                                  total -= appliedPromo.value;
    total = Math.max(0, total);
  }
  orderTotalEl.textContent = total.toFixed(2).replace('.', ',') + ' €';
}

document.getElementById('applyPromo').addEventListener('click', () => {
  const code = orderPromo.value.trim().toUpperCase();
  if (!code) { promoMsg.textContent = ''; appliedPromo = null; updateOrderTotal(); return; }
  const promo = PROMO_CODES[code];
  if (promo) {
    appliedPromo = promo;
    promoMsg.textContent = `✓ ${code} appliqué — ${promo.label}`;
    promoMsg.className = 'promo-msg ok';
  } else {
    appliedPromo = null;
    promoMsg.textContent = `✗ Code « ${code} » invalide`;
    promoMsg.className = 'promo-msg bad';
  }
  updateOrderTotal();
});

function buildOrderMessage() {
  const items = CartDB.getDetailed();
  const lines = items.map(({ product: p, size, qty }) =>
    `• ${p.name}\n  Taille ${size} × ${qty} = ${(p.price * qty).toFixed(2)} €`
  ).join('\n\n');

  const name  = document.getElementById('orderName').value.trim();
  const phone = document.getElementById('orderPhone').value.trim();
  const email = document.getElementById('orderEmail').value.trim();
  const modeT = '🛍️ Retrait au magasin de Kawéni (gratuit)';
  const det   = document.getElementById('orderDetails').value.trim() || '—';
  const promoLine = appliedPromo
    ? `\n🎁 Code promo : ${orderPromo.value.trim().toUpperCase()} (${appliedPromo.label})`
    : '';
  const total = orderTotalEl.textContent;
  const sousTotal = CartDB.total().toFixed(2).replace('.', ',') + ' €';

  // Ligne paiement + note SumUp si paiement carte en ligne
  const payId = orderPayment.value;
  let payLine = `💳 Paiement choisi : ${paymentLabelOf(payId)}`;
  if (payId === 'online-card') {
    // Jamais de page "montant libre" : soit un lien au montant exact
    // (généré par l'API), soit le vendeur l'envoie manuellement.
    payLine += pendingCheckoutUrl
      ? `\n➡️ Je paie ici (montant exact ${total}) :\n${pendingCheckoutUrl}`
      : `\n➡️ En attente du lien de paiement SumUp au montant exact (${total}).`;
  }

  return `🛍️ NOUVELLE COMMANDE — ${CONTACT_INFO.shopName}

🎫 CODE DE RETRAIT : ${pendingPickupCode || '(généré à l\'envoi)'}
📍 À présenter au magasin de Kawéni pour récupérer la commande.

📦 Articles (${CartDB.count()}) :

${lines}

💰 Sous-total : ${sousTotal}${promoLine}
💵 TOTAL : ${total}

${payLine}

👤 Client : ${name}
📞 Téléphone : ${phone}
📧 Email : ${email}

${modeT}
📝 Précisions :
${det}

Merci de me confirmer quand la commande est prête au retrait. 🙏`;
}

function validateOrderForm() {
  if (CartDB.count() === 0) { showToast('🛒 Ton panier est vide'); return false; }
  const required = ['orderName','orderPhone','orderEmail'];
  for (const id of required) {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      el.focus(); el.reportValidity?.();
      showToast('⚠ Merci de remplir tous les champs');
      return false;
    }
  }
  const email = document.getElementById('orderEmail').value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('orderEmail').focus();
    showToast('📧 Adresse e-mail invalide');
    return false;
  }
  if (!orderPayment.value) {
    payMethodsWrap.scrollIntoView({ behavior:'smooth', block:'center' });
    showToast('💳 Choisis un mode de paiement');
    return false;
  }
  return true;
}

function saveOrderLocal() {
  // Code de retrait généré maintenant : il figure dans le message ET le reçu
  pendingPickupCode = generatePickupCode();
  // Si l'utilisateur est connecté, on associe la commande à son email
  const userEmail = (typeof UserDB !== 'undefined' && UserDB.isLoggedIn())
    ? UserDB.get()?.email
    : null;
  const order = OrderDB.add({
    items: CartDB.getDetailed().map(({ product: p, size, qty }) => ({
      productId: p.id, productName: p.name, price: p.price, size, qty
    })),
    name: document.getElementById('orderName').value.trim(),
    phone: document.getElementById('orderPhone').value.trim(),
    email: document.getElementById('orderEmail').value.trim(),
    mode: 'retrait',
    details: document.getElementById('orderDetails').value.trim(),
    promo: appliedPromo ? orderPromo.value.trim().toUpperCase() : null,
    payment: orderPayment.value,
    pickupCode: pendingPickupCode,
    total: orderTotalEl.textContent,
    message: buildOrderMessage(),
    userEmail,
    status: 'envoyée'
  });
  return sendReceiptEmail(order); // → { server, emailSent } pour l'écran de confirmation
}

/**
 * Enregistre la commande CÔTÉ SERVEUR (/api/orders, Netlify Blobs).
 * Le serveur valide les prix contre le catalogue publié, stocke la
 * commande (visible dans l'admin) et envoie le reçu e-mail avec le
 * code de retrait (Resend).
 * Renvoie une promesse résolue en :
 *   { server:true,  emailSent:true|false }  → commande enregistrée
 *   { server:false }                        → serveur injoignable
 * (jamais rejetée : le code reste affiché à l'écran quoi qu'il arrive)
 */
function sendReceiptEmail(order) {
  const timeout = new Promise(res => setTimeout(() => res({ server: false }), 6000));
  const post = fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: order.name, email: order.email, phone: order.phone,
      pickupCode: order.pickupCode, total: order.total,
      payment: order.payment, promo: order.promo,
      items: order.items.map(i => ({
        productId: i.productId, productName: i.productName,
        size: i.size, qty: i.qty, price: i.price
      }))
    })
  })
    .then(r => r.ok ? r.json() : { ok: false })
    .then(d => ({ server: !!d.ok, emailSent: !!d.emailSent }))
    .catch(() => ({ server: false }));
  return Promise.race([post, timeout]);
}

/** Affiche l'écran de confirmation dans la modale (code + QR de retrait).
 *  Le message e-mail dit la VÉRITÉ selon le résultat serveur. */
function showOrderSuccess(code, status, email) {
  orderForm.hidden = true;
  orderCartSum.hidden = true;
  orderModal.querySelector('h2').textContent = 'Commande envoyée 🎉';
  orderModal.querySelector('.modal-sub').textContent =
    'Ta commande est enregistrée au magasin de Kawéni.';
  document.getElementById('successCode').textContent = code;

  const info = document.getElementById('successEmailInfo');
  if (status && status.server && status.emailSent) {
    info.innerHTML = `📧 Un reçu avec ce code vient d'être envoyé à <strong>${esc(email)}</strong>.`;
  } else if (status && status.server) {
    info.innerHTML = `⚠️ Commande bien enregistrée, mais l'e-mail de reçu n'a pas pu partir —
      <strong>note ton code ou prends-le en photo</strong>. Il reste visible dans « Mon compte ».`;
  } else {
    info.innerHTML = `⚠️ <strong>Note ton code ou prends-le en photo</strong> — il reste aussi
      visible dans « Mon compte » sur cet appareil.`;
  }

  const qr = document.getElementById('successQr');
  qr.hidden = true;
  qr.onload  = () => { qr.hidden = false; };
  qr.onerror = () => { qr.hidden = true; }; // préview locale sans functions
  qr.src = '/api/qr?data=' + encodeURIComponent(code);
  document.getElementById('orderSuccess').hidden = false;
}

/* ============ LIEN SUMUP AU MONTANT EXACT (API) ============ */
let pendingCheckoutUrl = null;
/* Code de retrait de la commande en cours (généré dans saveOrderLocal) */
let pendingPickupCode = null;

/** Total actuel en nombre (ex: "69,99 €" → 69.99) */
function currentTotalNumber() {
  return parseFloat(orderTotalEl.textContent.replace(/[^\d,\.]/g, '').replace(',', '.')) || 0;
}

/**
 * Tente de créer un lien de paiement SumUp verrouillé au montant exact
 * via la fonction Netlify. Silencieux en cas d'échec (fonction pas
 * encore configurée, hors-ligne, etc.) → repli sur l'envoi manuel.
 */
async function tryCreateCheckout() {
  pendingCheckoutUrl = null;
  if (orderPayment.value !== 'online-card') return;
  const amount = currentTotalNumber();
  if (!amount || amount <= 0) return;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(PAYMENT_CONFIG.checkoutEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        reference: 'CS-' + Date.now(),
        description: `Commande CASAL SPORT — ${CartDB.count()} article(s)`
      }),
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.url) pendingCheckoutUrl = data.url;
  } catch { /* repli silencieux : lien envoyé manuellement par le vendeur */ }
}

/* ============ CONFIRMATION DE COMMANDE ============
   Plus d'envoi WhatsApp/e-mail manuel : la commande part directement
   au serveur (saveOrderLocal → /api/orders) qui la stocke pour l'admin
   et envoie le reçu e-mail. Le code de retrait s'affiche à l'écran. */
orderForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateOrderForm()) return;
  const btn = document.getElementById('confirmOrder');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';
  const clientEmail = document.getElementById('orderEmail').value.trim();
  await tryCreateCheckout();            // dormant tant que la carte en ligne est désactivée
  const status = await saveOrderLocal(); // commande serveur + reçu e-mail (≤ 6 s)
  showOrderSuccess(pendingPickupCode, status, clientEmail);
  pendingCheckoutUrl = null;
  pendingPickupCode = null;
  CartDB.clear();
  updateCartCounter();
  btn.disabled = false;
  btn.textContent = '✅ Confirmer ma commande';
});

document.getElementById('successClose')?.addEventListener('click', closeOrderModal);

/* ============ TOAST ============ */
const toast = document.getElementById('toast');
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ============ SCROLL TOP ============ */
const scrollTop = document.getElementById('scrollTop');
window.addEventListener('scroll', () => { scrollTop?.classList.toggle('visible', window.scrollY > 500); });

/* ============ FAB WHATSAPP ============ */
const waFab     = document.getElementById('waFab');
const waFabMain = document.getElementById('waFabMain');
const waFabMenu = document.getElementById('waFabMenu');
waFabMain?.addEventListener('click', e => {
  e.stopPropagation();
  const open = !waFabMenu.hidden;
  waFabMenu.hidden = open;
  waFab.classList.toggle('open', !open);
});
document.addEventListener('click', e => {
  if (waFab && !waFab.contains(e.target) && !waFabMenu.hidden) {
    waFabMenu.hidden = true;
    waFab.classList.remove('open');
  }
});
document.querySelectorAll('.wa-fab-item').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const num = a.dataset.num;
    const msg = encodeURIComponent(`Bonjour CASAL SPORT 👋\nJe vous contacte depuis votre site.`);
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
    waFabMenu.hidden = true;
    waFab.classList.remove('open');
  });
});

/* ============ GUIDE TAILLES ============ */
const sizeModal = document.getElementById('sizeModal');
function openSizeGuide()  { sizeModal.hidden = false; document.body.style.overflow = 'hidden'; }
function closeSizeGuide() { sizeModal.hidden = true;  document.body.style.overflow = ''; }
window.openSizeGuide  = openSizeGuide;
window.closeSizeGuide = closeSizeGuide;
sizeModal?.addEventListener('click', e => { if (e.target === sizeModal) closeSizeGuide(); });
/* Ouvertures du guide des tailles : liens/boutons data-size-guide
   (remplace les handlers inline, incompatibles avec la CSP) */
document.querySelectorAll('[data-size-guide]').forEach(el =>
  el.addEventListener('click', e => { e.preventDefault(); openSizeGuide(); })
);
document.getElementById('sizeModalClose')?.addEventListener('click', closeSizeGuide);
document.querySelectorAll('.size-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.size-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.size-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

/* ============ LIGHTBOX ============ */
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
function openLightbox(src) { lightboxImg.src = src; lightbox.hidden = false; }
window.openLightbox = openLightbox;
lightbox?.addEventListener('click', () => { lightbox.hidden = true; });

/* ============ NEWSLETTER ============ */
const NEWS_KEY = 'casal_newsletter_seen_v2';
const newsModal = document.getElementById('newsletterModal');
function showNewsletter() { if (localStorage.getItem(NEWS_KEY)) return; newsModal.hidden = false; }
document.getElementById('newsletterClose')?.addEventListener('click', () => {
  newsModal.hidden = true;
  localStorage.setItem(NEWS_KEY, '1');
});
document.getElementById('newsletterForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('newsletterEmail').value;
  const list = JSON.parse(localStorage.getItem('casal_newsletter') || '[]');
  list.push({ email, date: new Date().toISOString() });
  localStorage.setItem('casal_newsletter', JSON.stringify(list));
  newsModal.hidden = true;
  localStorage.setItem(NEWS_KEY, '1');
  showToast('🎁 Inscription validée · Code BIENVENUE10');
});
setTimeout(showNewsletter, 9000);

/* Formulaire newsletter de la barre (listener au lieu d'onsubmit inline) */
document.getElementById('newsletterInline')?.addEventListener('submit', e => {
  e.preventDefault();
  const email = e.target.querySelector('input').value;
  const list = JSON.parse(localStorage.getItem('casal_newsletter') || '[]');
  list.push({ email, date: new Date().toISOString() });
  localStorage.setItem('casal_newsletter', JSON.stringify(list));
  e.target.reset();
  showToast('🎁 Inscription validée · Code BIENVENUE10');
});

/* ============================================================
   SHARE POPOVER (partage produit : Instagram, Messenger,
   Snapchat, WhatsApp, SMS, copier le lien, partage natif)
   ============================================================ */
const sharePopover = document.getElementById('sharePopover');
const shareNativeBtn = document.getElementById('shareNative');
let shareProductId = null;

// Affiche le bouton "Partager…" natif uniquement si le navigateur le supporte
if (navigator.share && shareNativeBtn) shareNativeBtn.hidden = false;

function shareUrlOf(product) {
  // URL deep-link : permet plus tard de pointer vers un produit specifique
  return `https://casal-sport-kaweni.netlify.app/?p=${product.id}`;
}
function shareTextOf(product) {
  return `🌴 ${product.name} — ${product.price.toFixed(2)} € · CASAL SPORT (Mayotte)`;
}

function openSharePopover(button, productId) {
  shareProductId = productId;
  const r = button.getBoundingClientRect();
  const w = 240;
  // Position : juste a gauche du bouton, ou au centre si pas la place
  let left = r.right - w;
  if (left < 8) left = r.left;
  if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
  sharePopover.style.top  = `${r.bottom + 6}px`;
  sharePopover.style.left = `${Math.max(8, left)}px`;
  sharePopover.hidden = false;
}
function closeSharePopover() {
  sharePopover.hidden = true;
  shareProductId = null;
}

sharePopover.querySelectorAll('button[data-share]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!shareProductId) return;
    const p = ProductDB.getAll().find(x => x.id === shareProductId);
    if (!p) return;
    const url  = shareUrlOf(p);
    const text = shareTextOf(p);
    const full = `${text}\n${url}`;

    switch (btn.dataset.share) {
      case 'native':
        if (navigator.share) {
          navigator.share({ title: p.name, text, url }).catch(() => {});
        }
        break;

      case 'instagram':
        // Instagram n'autorise pas l'ouverture directe avec un texte pré-rempli sur le web.
        // On copie le lien + texte, puis on ouvre Instagram pour que l'utilisateur colle.
        copyToClipboard(full).then(() => {
          showToast('📷 Lien copié — colle dans Instagram (Story / Bio / DM)');
          window.open('https://www.instagram.com/', '_blank');
        });
        break;

      case 'messenger':
        // Méthode Facebook Share Dialog (Messenger inclus côté FB)
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
          '_blank',
          'width=600,height=500'
        );
        break;

      case 'snapchat':
        // Snapchat web n'a pas d'URL de partage publique → on copie le lien
        copyToClipboard(full).then(() => {
          showToast('👻 Lien copié — colle dans Snapchat');
          window.open('https://www.snapchat.com/', '_blank');
        });
        break;

      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, '_blank');
        break;

      case 'sms':
        // sms: ouvre l'app SMS du téléphone
        window.location.href = `sms:?&body=${encodeURIComponent(full)}`;
        break;

      case 'copy':
        copyToClipboard(url).then(() => showToast('📋 Lien copié dans le presse-papier'));
        break;
    }
    closeSharePopover();
  });
});

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback : créer un textarea temporaire
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    return true;
  }
}

// Fermeture du popover : click ailleurs, scroll, Esc, resize
document.addEventListener('click', e => {
  if (sharePopover.hidden) return;
  if (sharePopover.contains(e.target)) return;
  if (e.target.closest('.share-icon')) return;
  closeSharePopover();
});
window.addEventListener('scroll', () => { if (!sharePopover.hidden) closeSharePopover(); }, { passive: true });
window.addEventListener('resize', () => { if (!sharePopover.hidden) closeSharePopover(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !sharePopover.hidden) closeSharePopover();
});

/* ============ INIT ============ */
renderCarousel();
applyFilter('grid-vet');
applyFilter('grid-bas');
renderFavorites();
updateFavCounter();
updateCartCounter();

/* ============================================================
   POLISH 2026 — reveal, header compact, collections, deep-link
   ============================================================ */

/* ===== Reveal au scroll ===== */
(function initReveal() {
  const targets = document.querySelectorAll(
    '.section-head, .collection-tile, .trust-item, .split-banner, ' +
    '.story-img, .story-content, .testimonial, .shop-band-inner, .stats .stat'
  );
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  targets.forEach((el, i) => {
    el.classList.add('reveal');
    // Léger décalage en cascade pour les éléments voisins
    el.style.transitionDelay = `${(i % 4) * 60}ms`;
    io.observe(el);
  });
})();

/* ===== Header compact au scroll ===== */
(function initHeaderShrink() {
  const header = document.querySelector('.header');
  if (!header) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      header.classList.toggle('compact', window.scrollY > 60);
      ticking = false;
    });
  }, { passive: true });
})();

/* ===== Tuiles Collections → filtre catégorie ===== */
document.querySelectorAll('.collection-tile[data-cat]').forEach(tile => {
  tile.addEventListener('click', e => {
    e.preventDefault();
    const cat = tile.dataset.cat;
    const s = filterState['grid-vet'];
    s.cats = [cat]; s.subs = []; s.prices = []; s.inStock = false; s.promo = false; s.news = false;
    applyFilter('grid-vet');
    document.getElementById('vetements')?.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ===== Liens des méga-menus → filtre catégorie + type d'article ===== */
document.querySelectorAll('[data-fcat], [data-fsub]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    closeAllMegas();
    const sub = link.dataset.fsub || '';
    const cat = link.dataset.fcat || '';
    // Les baskets vivent dans la section Chaussures, le reste dans Textile
    const gridId = sub === 'basket' ? 'grid-bas' : 'grid-vet';
    const s = filterState[gridId];
    s.cats = cat ? [cat] : [];
    s.subs = (sub && sub !== 'basket') ? [sub] : [];
    s.prices = []; s.inStock = false; s.promo = false; s.news = false;
    applyFilter(gridId);
    const sectionId = gridId === 'grid-bas' ? 'baskets' : 'vetements';
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ===== Deep-link ?p=ID (liens partagés) ===== */
(function initDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const pid = parseInt(params.get('p'), 10);
  if (!pid) return;
  const product = ProductDB.getLive().find(x => x.id === pid);
  if (!product) return;
  const gridId = product.type === 'basket' ? 'grid-bas' : 'grid-vet';
  // Reset les filtres pour garantir la visibilité du produit
  const s = filterState[gridId];
  s.cats = []; s.subs = []; s.prices = []; s.inStock = false; s.promo = false; s.news = false; s.q = '';
  applyFilter(gridId);
  setTimeout(() => {
    const card = document.querySelector(`#${gridId} .card[data-id="${pid}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('spotlight');
    setTimeout(() => card.classList.remove('spotlight'), 5000);
  }, 350);
})();

/* ============================================================
   A11y (audit V8) : le focus clavier reste piégé dans la modale
   ou le tiroir ouvert (Tab / Shift+Tab cyclent à l'intérieur).
   ============================================================ */
document.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const overlay = [...document.querySelectorAll('.modal-overlay')].find(m => !m.hidden);
  const panel = (overlay && overlay.querySelector('.modal-box'))
    || (cartDrawer.classList.contains('open') ? cartDrawer : null)
    || (filterDrawer.classList.contains('open') ? filterDrawer : null);
  if (!panel) return;
  const focusables = panel.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last  = focusables[focusables.length - 1];
  if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
    last.focus(); e.preventDefault();
  } else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
    first.focus(); e.preventDefault();
  }
});

/* ============================================================
   SYNCHRO CATALOGUE (audit V1) : si l'admin a publié un catalogue
   en ligne, on re-rend les grilles avec la version à jour.
   ============================================================ */
syncCatalogFromServer().then(changed => {
  if (!changed) return;
  applyFilter('grid-vet');
  applyFilter('grid-bas');
  renderCarousel();
  renderFavorites();
  updateFavCounter();
});
