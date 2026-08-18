/* ============================================================
   /api/stats — fréquentation du site (Netlify Blobs).

   Ce que ça mesure :
   - les visites (une par session de navigateur, pas par page vue)
   - les ouvertures de fiche produit, pour connaître l'article
     qui attire le plus de clics

   Ce que ça NE stocke PAS : aucune adresse IP, aucun identifiant
   de visiteur, aucun cookie. Uniquement des compteurs agrégés par
   jour. Rien ici ne permet de reconnaître ou de suivre quelqu'un.

   - POST /api/stats          (public) : { type:'visit' } ou
                                         { type:'view', productId }
   - GET  /api/stats?top=1    (public) : classement des ventes, pour
                                         le bandeau « les plus achetés »
   - GET  /api/stats          (admin)  : fréquentation + ventes par jour

   Le chiffre d'affaires et les meilleures ventes sont RECALCULÉS
   depuis les commandes : rien n'est compté deux fois, et une
   commande annulée sort d'elle-même des statistiques.
   ============================================================ */
import { getStore } from '@netlify/blobs';

const json = (data, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': cache },
  });

const DAYS_KEPT = 90;             // trois mois d'historique suffisent au commerce
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/* Les deux parties de la boutique. Les accessoires unisexes ('mixte')
   n'appartiennent à aucune : les compter dans les deux gonflerait le
   chiffre d'affaires total. Ils restent dans le cumul général. */
const UNIVERSE_OF = { homme: 'homme', garcon: 'homme', femme: 'femme', fille: 'femme' };
const universeOf = (cat) => UNIVERSE_OF[cat] || null;

/** Les N derniers jours au format AAAA-MM-JJ, du plus ancien au plus récent. */
function lastDays(n) {
  const out = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(new Date(now - i * 86400_000)));
  return out;
}

export default async (req, context) => {
  const store = getStore('casal-sport');
  const isAdmin = () => {
    const expected = process.env.ADMIN_PASSWORD;
    return expected && req.headers.get('x-admin-key') === expected;
  };

  /* ---------------------------- Collecte (public) ---------------------------- */
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400); }

    const type = body.type === 'view' ? 'view' : body.type === 'visit' ? 'visit' : null;
    if (!type) return json({ error: 'Type inconnu' }, 400);

    const key = `stats/${dayKey()}`;
    const day = (await store.get(key, { type: 'json' })) || { visits: 0, views: {} };

    if (type === 'visit') {
      day.visits = (day.visits || 0) + 1;
      // Partie consultée, quand le visiteur en a choisi une
      const u = universeOf(body.u === 'homme' ? 'homme' : body.u === 'femme' ? 'femme' : null);
      if (u === 'homme') day.visitsHomme = (day.visitsHomme || 0) + 1;
      if (u === 'femme') day.visitsFemme = (day.visitsFemme || 0) + 1;
    } else {
      const id = Math.floor(Number(body.productId));
      if (!id) return json({ error: 'Produit inconnu' }, 400);
      day.views = day.views || {};
      day.views[id] = (day.views[id] || 0) + 1;
    }

    // Lecture-modification-écriture simple : deux visites à la même
    // milliseconde peuvent s'écraser. Pour un compteur de fréquentation
    // c'est sans conséquence — mieux vaut perdre une visite de temps en
    // temps que ralentir chaque page pour un chiffre indicatif.
    try { await store.setJSON(key, day); }
    catch (e) { console.error('Statistiques non enregistrées :', e); }

    return json({ ok: true });
  }

  if (req.method !== 'GET') return json({ error: 'Méthode non autorisée' }, 405);

  /* -------- Meilleures ventes (public, sans aucune donnée client) -------- */
  const url = new URL(req.url);
  if (url.searchParams.get('top')) {
    const sold = await soldByProduct(store, 30);
    const top = Object.entries(sold)
      .map(([id, v]) => ({ productId: Number(id), sold: v.qty }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 8);
    // Mise en cache courte : ce classement bouge lentement et s'affiche
    // sur toutes les pages d'accueil.
    return json({ top }, 200, 'public, max-age=300');
  }

  /* ---------------------------- Tableau de bord (admin) ---------------------------- */
  if (!isAdmin()) return json({ error: 'Non autorisé' }, 401);

  const days = lastDays(30);
  const stats = await Promise.all(days.map((d) => store.get(`stats/${d}`, { type: 'json' })));

  // Fréquentation par jour + cumul des vues produit, ventilés par partie
  const viewsTotal = {};
  const traffic = days.map((d, i) => {
    const s = stats[i] || {};
    Object.entries(s.views || {}).forEach(([id, n]) => {
      viewsTotal[id] = (viewsTotal[id] || 0) + n;
    });
    return {
      day: d,
      visits: s.visits || 0,
      visitsBy: { homme: s.visitsHomme || 0, femme: s.visitsFemme || 0 },
    };
  });

  /* Ventes par jour, recalculées depuis les commandes.
     Le catalogue donne la catégorie de chaque produit, ce qui permet de
     ventiler le chiffre d'affaires LIGNE PAR LIGNE entre les deux
     parties — une commande mixte n'est donc comptée en double nulle
     part. Pour le nombre de commandes en revanche, une commande qui
     contient les deux compte dans les deux : on ne peut pas couper une
     commande en deux. */
  const catalog = (await store.get('catalog', { type: 'json' })) || [];
  const catOf = Object.fromEntries(catalog.map((p) => [p.id, p.cat]));

  const orders = await allOrders(store);
  const vide = () => ({ orders: 0, revenue: 0, byU: { homme: { orders: 0, revenue: 0 }, femme: { orders: 0, revenue: 0 } } });
  const byDay = Object.fromEntries(days.map((d) => [d, vide()]));
  const sold = {};
  for (const o of orders) {
    if (o.status === 'annulee') continue;          // une annulation n'est pas une vente
    const d = dayKey(new Date(o.id));
    const total = Number(o.totalComputed) || 0;
    const presentes = new Set();
    if (byDay[d]) { byDay[d].orders += 1; byDay[d].revenue += total; }
    for (const l of o.items || []) {
      const id = Number(l.productId);
      if (!id) continue;
      const cat = catOf[id];
      const u = universeOf(cat);
      const ligne = (Number(l.price) || 0) * (Number(l.qty) || 0);
      if (u && byDay[d]) { byDay[d].byU[u].revenue += ligne; presentes.add(u); }
      sold[id] = sold[id] || { qty: 0, revenue: 0, name: l.productName || '', cat: cat || null };
      sold[id].qty += Number(l.qty) || 0;
      sold[id].revenue += ligne;
      if (l.productName) sold[id].name = l.productName;
      if (cat) sold[id].cat = cat;
    }
    if (byDay[d]) presentes.forEach((u) => { byDay[d].byU[u].orders += 1; });
  }

  const arrondi = (n) => Math.round(n * 100) / 100;
  const series = days.map((d, i) => ({
    day: d,
    visits: traffic[i].visits,
    visitsBy: traffic[i].visitsBy,
    orders: byDay[d].orders,
    revenue: arrondi(byDay[d].revenue),
    byUniverse: {
      homme: { orders: byDay[d].byU.homme.orders, revenue: arrondi(byDay[d].byU.homme.revenue) },
      femme: { orders: byDay[d].byU.femme.orders, revenue: arrondi(byDay[d].byU.femme.revenue) },
    },
  }));

  const totalVisits = series.reduce((s, x) => s + x.visits, 0);
  const totalOrders = series.reduce((s, x) => s + x.orders, 0);

  /* Le taux de conversion n'a de sens que si la mesure des visites
     couvre la même période que les commandes. Au démarrage, des
     commandes antérieures au comptage donneraient un taux absurde
     (150 % observé en production). On ne le calcule qu'à partir d'un
     volume qui veut dire quelque chose, et on le borne à 100 %. */
  const MIN_VISITES_FIABLE = 30;
  const premierJourMesure = series.find((s) => s.visits > 0)?.day || null;
  const conversion = totalVisits >= MIN_VISITES_FIABLE
    ? Math.min(100, Math.round((totalOrders / totalVisits) * 1000) / 10)
    : null;

  // Purge des journées trop anciennes. Faite ici, à la consultation du
  // tableau de bord (rare), plutôt qu'à chaque visite enregistrée.
  purgeOldDays(store).catch((e) => console.error('Purge des statistiques :', e));

  return json({
    series,
    totals: {
      visits: totalVisits,
      orders: totalOrders,
      revenue: Math.round(series.reduce((s, x) => s + x.revenue, 0) * 100) / 100,
      // Part des visites qui aboutissent à une commande (null tant que
      // le volume mesuré est trop faible pour être significatif)
      conversion,
      measuredSince: premierJourMesure,
    },
    // `cat` accompagne chaque entrée : l'admin filtre les classements
    // par partie sans avoir à interroger le catalogue de son côté.
    topViewed: Object.entries(viewsTotal)
      .map(([id, n]) => ({ productId: Number(id), views: n, cat: catOf[id] || null }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 30),
    topSold: Object.entries(sold)
      .map(([id, v]) => ({ productId: Number(id), name: v.name, qty: v.qty, revenue: arrondi(v.revenue), cat: v.cat }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 30),
  });
};

/* ------------------------------------------------------------- Utilitaires */

/** Supprime les journées au-delà de l'historique conservé. */
async function purgeOldDays(store) {
  const limite = dayKey(new Date(Date.now() - DAYS_KEPT * 86400_000));
  const { blobs } = await store.list({ prefix: 'stats/' });
  for (const b of blobs) {
    const jour = b.key.slice('stats/'.length);
    if (jour < limite) await store.delete(b.key);   // dates ISO : l'ordre texte est chronologique
  }
}

async function allOrders(store) {
  const { blobs } = await store.list({ prefix: 'orders/' });
  const list = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })));
  return list.filter(Boolean);
}

/** Quantités vendues par produit sur les N derniers jours (hors annulations). */
async function soldByProduct(store, days) {
  const since = Date.now() - days * 86400_000;
  const orders = await allOrders(store);
  const sold = {};
  for (const o of orders) {
    if (o.status === 'annulee' || o.id < since) continue;
    for (const l of o.items || []) {
      const id = Number(l.productId);
      if (!id) continue;
      sold[id] = sold[id] || { qty: 0 };
      sold[id].qty += Number(l.qty) || 0;
    }
  }
  return sold;
}
