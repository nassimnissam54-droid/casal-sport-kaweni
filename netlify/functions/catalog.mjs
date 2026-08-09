/* ============================================================
   /api/catalog — catalogue produits CENTRALISÉ (Netlify Blobs).
   Résout la faille V1 de l'audit : les modifications faites dans
   l'admin deviennent visibles par TOUS les visiteurs, plus
   seulement dans le navigateur de l'admin.

   - GET  (public)  : liste des produits publiée, ou 404 si l'admin
                      n'a encore rien publié (le front garde alors
                      son catalogue par défaut products.js).
   - POST (admin)   : { action:'replace', catalog:[...] } publie le
                      catalogue complet. Auth : en-tête x-admin-key
                      comparé à la variable d'environnement
                      ADMIN_PASSWORD (jamais dans le code).

   Variables d'environnement Netlify :
   - ADMIN_PASSWORD : mot de passe admin (le même que la page admin)
   ============================================================ */
import { getStore } from '@netlify/blobs';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const S = (v, max) => String(v ?? '').slice(0, max);

/* Stock numérique : `qty` fait foi, `stock` n'en est que l'affichage.
   Les produits d'avant cette version n'ont pas de `qty` : on la déduit
   de leur statut plutôt que de les faire tomber à zéro. */
const LOW_STOCK = 3;
const QTY_FROM_STATUS = { in: 10, low: LOW_STOCK, out: 0 };
const qtyOf = (p) =>
  Number.isFinite(Number(p?.qty))
    ? Math.max(0, Math.min(99999, Math.floor(Number(p.qty))))
    : (QTY_FROM_STATUS[p?.stock] ?? QTY_FROM_STATUS.in);
const stockFromQty = (q) => (q <= 0 ? 'out' : q <= LOW_STOCK ? 'low' : 'in');

function sanitizeProduct(p) {
  return {
    id: Math.floor(Number(p.id)) || 0,
    type: p.type === 'basket' ? 'basket' : 'vetement',
    sub: S(p.sub, 20),
    cat: S(p.cat, 12),
    name: S(p.name, 120),
    price: Math.max(0, Math.min(100000, Number(p.price) || 0)),
    oldPrice: p.oldPrice ? Math.max(0, Math.min(100000, Number(p.oldPrice))) : null,
    badge: S(p.badge, 30),
    desc: S(p.desc, 1200),
    material: S(p.material, 300),
    sizes: S(p.sizes, 200),
    icon: S(p.icon, 8),
    qty: qtyOf(p),
    qtyUpdatedAt: Number(p.qtyUpdatedAt) || 0,
    // Drapeau posé par l'admin quand le magasin a saisi une quantité
    qtyDirty: p.qtyDirty === true,
    stock: stockFromQty(qtyOf(p)),
    status: p.status === 'draft' ? 'draft' : 'live',
    imageUrl: S(p.imageUrl, 600000), // autorise les data-URI (≤ 400 Ko côté admin)
    // Galerie : photos supplémentaires de la fiche produit
    images: Array.isArray(p.images) ? p.images.slice(0, 8).map((u) => S(u, 600000)).filter(Boolean) : [],
    // Couleurs sélectionnables : [{ name, hex }]
    colorOptions: Array.isArray(p.colorOptions)
      ? p.colorOptions.slice(0, 12)
          .map((c) => (c && c.name ? { name: S(c.name, 30), hex: S(c.hex, 9) || '#cccccc' } : null))
          .filter(Boolean)
      : [],
    color1: S(p.color1, 9),
    color2: S(p.color2, 9),
    createdAt: Number(p.createdAt) || Date.now(),
    rating: Math.max(0, Math.min(5, Number(p.rating) || 0)),
  };
}

export default async (req) => {
  const store = getStore('casal-sport');

  if (req.method === 'GET') {
    const catalog = await store.get('catalog', { type: 'json' });
    if (!catalog) return json({ error: 'Catalogue non publié' }, 404);
    return json(catalog);
  }

  if (req.method === 'POST') {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return json({ error: 'ADMIN_PASSWORD non configuré sur Netlify' }, 501);
    if (req.headers.get('x-admin-key') !== expected)
      return json({ error: 'Non autorisé' }, 401);

    let body;
    try { body = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400); }
    if (body.action !== 'replace' || !Array.isArray(body.catalog))
      return json({ error: 'Format attendu : { action:"replace", catalog:[...] }' }, 400);
    if (body.catalog.length > 500)
      return json({ error: 'Catalogue trop volumineux (max 500 produits)' }, 400);

    const clean = body.catalog.map(sanitizeProduct).filter((p) => p.id > 0 && p.name);

    /* Fusion des quantités.
       L'admin republie tout le catalogue à chaque modification, y
       compris des produits qu'il n'a pas touchés — et pendant ce temps
       /api/orders décrémente le stock. Sans précaution, la publication
       ferait « remonter » le stock déjà vendu.

       On n'arbitre PAS par horodatage : l'admin tourne dans le
       navigateur du magasin et le décrément sur un serveur Netlify, deux
       horloges qu'on ne peut pas comparer. Un poste en retard de
       quelques secondes suffirait à rendre tout réassort impossible.

       L'admin marque donc explicitement (`qtyDirty`) les produits dont
       il vient de saisir la quantité : ceux-là s'imposent, les autres
       gardent la valeur du serveur. */
    const current = (await store.get('catalog', { type: 'json' })) || [];
    let preserved = 0, applied = 0;
    for (const p of clean) {
      const before = current.find((x) => x.id === p.id);
      if (p.qtyDirty) { applied++; }            // saisie du magasin : elle gagne
      else if (before) {
        p.qty = qtyOf(before);
        p.stock = stockFromQty(p.qty);
        p.qtyUpdatedAt = Number(before.qtyUpdatedAt) || 0;
        preserved++;
      }
      delete p.qtyDirty;                        // jamais stocké côté serveur
    }

    await store.setJSON('catalog', clean);
    return json({ ok: true, count: clean.length, stockPreserved: preserved, stockApplied: applied });
  }

  return json({ error: 'Méthode non autorisée' }, 405);
};
