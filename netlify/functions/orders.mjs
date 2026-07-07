/* ============================================================
   /api/orders — commandes CENTRALISÉES (Netlify Blobs).
   Résout les failles V2 et S2 de l'audit :
   - chaque commande est enregistrée côté serveur au moment du
     checkout (même si le client n'envoie jamais le WhatsApp) ;
   - le reçu e-mail est envoyé PAR LE SERVEUR après validation et
     rate-limit — l'ancien endpoint « relais e-mail ouvert »
     send-receipt est supprimé.

   - POST  (public) : création de commande. Validation stricte des
     champs, prix re-vérifiés contre le catalogue publié quand il
     existe, plafonds anti-abus, max 5 commandes/heure/IP.
   - GET   (admin, x-admin-key) : liste des commandes serveur.
   - PATCH (admin) : { id, status } — met à jour le suivi.

   Variables d'environnement Netlify :
   - ADMIN_PASSWORD : auth des opérations admin
   - RESEND_API_KEY : envoi des reçus (sinon pas d'e-mail, commande OK)
   - EMAIL_FROM     : expéditeur (défaut onboarding@resend.dev, pour tester)
   - STORE_EMAIL    : copie de chaque commande au magasin
   ============================================================ */
import { getStore } from '@netlify/blobs';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const S = (v, max) => String(v ?? '').slice(0, max);
const esc = (s) => String(s).replace(/[&<>"']/g, (m) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);

const STATUSES = ['recue', 'confirmee', 'preparation', 'prete', 'retiree'];

export default async (req, context) => {
  const store = getStore('casal-sport');
  const isAdmin = () => {
    const expected = process.env.ADMIN_PASSWORD;
    return expected && req.headers.get('x-admin-key') === expected;
  };

  /* ---------------------------- Création (public) ---------------------------- */
  if (req.method === 'POST') {
    // Rate-limit : 5 commandes / heure / IP
    const ip = context.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
    const rlKey = `ratelimit/${ip.replace(/[^\w.:]/g, '_')}`;
    const now = Date.now();
    const rl = (await store.get(rlKey, { type: 'json' })) || { count: 0, since: now };
    if (now - rl.since > 3600_000) { rl.count = 0; rl.since = now; }
    if (rl.count >= 5) return json({ error: 'Trop de commandes, réessaie plus tard.' }, 429);

    let o;
    try { o = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400); }

    const name  = S(o.name, 80).trim();
    const phone = S(o.phone, 25).trim();
    const email = S(o.email, 120).trim();
    const code  = S(o.pickupCode, 20).trim();
    const items = Array.isArray(o.items) ? o.items.slice(0, 30) : [];
    if (!name || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !code || !items.length)
      return json({ error: 'Commande incomplète' }, 400);

    // Re-vérification des prix contre le catalogue publié (s'il existe)
    const catalog = await store.get('catalog', { type: 'json' });
    const lines = [];
    for (const it of items) {
      const qty = Math.max(1, Math.min(99, Math.floor(Number(it.qty)) || 1));
      let price = Math.max(0, Math.min(100000, Number(it.price) || 0));
      let productName = S(it.productName, 120);
      if (catalog) {
        const ref = catalog.find((p) => p.id === Number(it.productId));
        if (!ref) return json({ error: `Produit inconnu : ${S(it.productId, 12)}` }, 400);
        price = ref.price;           // prix serveur, pas celui du client
        productName = ref.name;
      }
      lines.push({ productId: Number(it.productId) || 0, productName, size: S(it.size, 40), qty, price });
    }
    const computedTotal = Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100;
    if (computedTotal > 5000) return json({ error: 'Montant trop élevé' }, 400);

    const order = {
      id: now,
      date: new Date(now).toISOString(),
      name, phone, email,
      pickupCode: code,
      payment: S(o.payment, 20),
      promo: S(o.promo, 20) || null,
      items: lines,
      // total affiché client (peut inclure une promo) + total recalculé serveur
      totalDisplayed: S(o.total, 20),
      totalComputed: computedTotal,
      status: 'recue',
      statusHistory: [{ status: 'recue', date: now }],
    };

    rl.count += 1;
    await store.setJSON(rlKey, rl);
    await store.setJSON(`orders/${now}`, order);

    const emailSent = await sendReceipt(order).catch((e) => {
      console.error('Reçu non envoyé :', e);
      return false;
    });

    return json({ ok: true, id: now, emailSent });
  }

  /* ---------------------------- Admin : liste ---------------------------- */
  if (req.method === 'GET') {
    if (!isAdmin()) return json({ error: 'Non autorisé' }, 401);
    const { blobs } = await store.list({ prefix: 'orders/' });
    const orders = (await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })))).filter(Boolean);
    orders.sort((a, b) => b.id - a.id);
    return json(orders.slice(0, 300));
  }

  /* ---------------------------- Admin : statut ---------------------------- */
  if (req.method === 'PATCH') {
    if (!isAdmin()) return json({ error: 'Non autorisé' }, 401);
    let body;
    try { body = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400); }
    if (!STATUSES.includes(body.status)) return json({ error: 'Statut inconnu' }, 400);
    const key = `orders/${Math.floor(Number(body.id))}`;
    const order = await store.get(key, { type: 'json' });
    if (!order) return json({ error: 'Commande introuvable' }, 404);
    order.status = body.status;
    order.statusHistory = (order.statusHistory || []).filter((h) => h.status !== body.status);
    order.statusHistory.push({ status: body.status, date: Date.now() });
    await store.setJSON(key, order);
    return json(order);
  }

  return json({ error: 'Méthode non autorisée' }, 405);
};

/* ------------------------------------------------------------- Reçu e-mail */
async function sendReceipt(order) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const from = process.env.EMAIL_FROM || 'Casal Sport Kaweni <onboarding@resend.dev>';

  const rows = order.items.map((l) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${esc(l.productName)}<br>
          <span style="color:#777;font-size:13px">Taille ${esc(l.size || '—')}</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${l.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${(l.price * l.qty).toFixed(2)} €</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;background:#FBF5EA;font-family:Arial,Helvetica,sans-serif;color:#18181b">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="background:#0A0A0A;border-radius:14px 14px 0 0;padding:20px 24px">
      <span style="color:#fff;font-size:20px;font-weight:900">CASAL <span style="color:#FF4D3D">SPORT</span></span>
      <span style="color:#999;font-size:12px;display:block">Kawéni · Mayotte</span>
    </div>
    <div style="background:#fff;border-radius:0 0 14px 14px;padding:24px">
      <h1 style="font-size:20px;margin:0 0 6px">Merci ${esc(order.name)} ! 🎉</h1>
      <p style="color:#555;margin:0 0 20px">Ta commande du ${new Date(order.id).toLocaleDateString('fr-FR')} est bien enregistrée.</p>
      <div style="border:2px solid #FF4D3D;border-radius:14px;text-align:center;padding:20px;margin:20px 0">
        <p style="margin:0;color:#777;font-size:12px;letter-spacing:2px">CODE DE RETRAIT</p>
        <p style="margin:6px 0 0;font-size:34px;font-weight:900;letter-spacing:3px;color:#FF4D3D">${esc(order.pickupCode)}</p>
      </div>
      <p style="text-align:center;color:#555">Présente ce code au magasin <strong>Casal Sport de Kawéni</strong> (Mamoudzou) pour retirer ta commande.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <thead><tr>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #18181b;font-size:12px">ARTICLE</th>
          <th style="padding:8px 12px;border-bottom:2px solid #18181b;font-size:12px">QTÉ</th>
          <th style="text-align:right;padding:8px 12px;border-bottom:2px solid #18181b;font-size:12px">PRIX</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="2" style="padding:12px;font-weight:900">TOTAL${order.promo ? ` (code ${esc(order.promo)})` : ''}</td>
          <td style="padding:12px;text-align:right;font-weight:900;font-size:18px">${esc(order.totalDisplayed || order.totalComputed.toFixed(2) + ' €')}</td>
        </tr></tfoot>
      </table>
      <p style="color:#555;font-size:14px">🛍️ <strong style="color:#18181b">Retrait en magasin uniquement</strong> — aucune livraison.
         Le magasin te confirme par WhatsApp quand la commande est prête.</p>
      <p style="color:#999;font-size:12px;margin-top:20px">Cet e-mail fait office de reçu de commande — CASAL SPORT, Kawéni, Mamoudzou, Mayotte.</p>
    </div>
  </div>
</body></html>`;

  const send = (to, subject) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

  const r = await send(order.email, `🎫 Ton code de retrait ${order.pickupCode} — commande Casal Sport`);
  if (process.env.STORE_EMAIL) {
    await send(process.env.STORE_EMAIL, `🛒 Nouvelle commande de ${order.name} — ${order.pickupCode}`).catch(() => {});
  }
  return r.ok;
}
