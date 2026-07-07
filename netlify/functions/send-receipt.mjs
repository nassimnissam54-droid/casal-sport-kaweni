/* ============================================================
   POST /.netlify/functions/send-receipt
   Envoie le reçu de commande par e-mail (code de retrait + articles)
   juste après l'achat, via l'API Resend (https://resend.com).

   Variables d'environnement à configurer sur Netlify :
   - RESEND_API_KEY : clé API Resend (obligatoire pour l'envoi)
   - EMAIL_FROM     : expéditeur, ex "Casal Sport <recu@votredomaine.com>"
                      (par défaut : onboarding@resend.dev, utilisable pour tester)
   - STORE_EMAIL    : e-mail du magasin (reçoit une copie de chaque commande)

   Sans RESEND_API_KEY la fonction répond 200 {sent:false} : le site
   fonctionne quand même (le code de retrait figure dans le message
   WhatsApp et dans « Mon compte »).
   ============================================================ */

const PAY_LABELS = {
  'card-onsite': 'Carte bancaire au retrait',
  'cash': 'Espèces au retrait',
  'transfer': 'Virement bancaire',
  'online-card': 'Carte bancaire en ligne',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  let o;
  try { o = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }

  const email = String(o?.email || '').trim().slice(0, 120);
  const name = String(o?.name || 'Client').trim().slice(0, 80);
  const code = String(o?.pickupCode || '').trim().slice(0, 20);
  const items = Array.isArray(o?.items) ? o.items.slice(0, 40) : [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !code || !items.length)
    return json({ error: 'Données de commande incomplètes' }, 400);

  const key = process.env.RESEND_API_KEY;
  if (!key) return json({ sent: false, reason: 'RESEND_API_KEY non configurée' });

  const from = process.env.EMAIL_FROM || 'Casal Sport Kaweni <onboarding@resend.dev>';
  const total = String(o.total || '').slice(0, 20);
  const payLabel = String(o.paymentLabel || PAY_LABELS[o.payment] || o.payment || '').slice(0, 80);

  const rows = items.map((it) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(String(it.productName || '').slice(0, 100))}<br>
          <span style="color:#777;font-size:13px">Taille ${escapeHtml(String(it.size || '—').slice(0, 30))}</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${Math.max(1, Math.min(99, Number(it.qty) || 1))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${(Number(it.price) || 0).toFixed(2)} €</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="background:#0A0A0A;border-radius:12px 12px 0 0;padding:20px 24px">
      <span style="color:#fff;font-size:20px;font-weight:900">CASAL <span style="color:#FF4D3D">SPORT</span></span>
      <span style="color:#999;font-size:12px;display:block">Kawéni · Mayotte</span>
    </div>
    <div style="background:#fff;border-radius:0 0 12px 12px;padding:24px">
      <h1 style="font-size:20px;margin:0 0 6px">Merci ${escapeHtml(name)} ! 🎉</h1>
      <p style="color:#555;margin:0 0 20px">Ta commande du ${new Date().toLocaleDateString('fr-FR')} est bien enregistrée.</p>

      <div style="border:2px solid #FF4D3D;border-radius:12px;text-align:center;padding:20px;margin:20px 0">
        <p style="margin:0;color:#777;font-size:12px;letter-spacing:2px">CODE DE RETRAIT</p>
        <p style="margin:6px 0 0;font-size:34px;font-weight:900;letter-spacing:3px;color:#FF4D3D">${escapeHtml(code)}</p>
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
          <td colspan="2" style="padding:12px;font-weight:900">TOTAL${o.promo ? ` (code ${escapeHtml(String(o.promo).slice(0, 20))})` : ''}</td>
          <td style="padding:12px;text-align:right;font-weight:900;font-size:18px">${escapeHtml(total)}</td>
        </tr></tfoot>
      </table>

      <p><strong>Mode de paiement :</strong> ${escapeHtml(payLabel)}</p>
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

  try {
    const r = await send(email, `🎫 Ton code de retrait ${code} — commande Casal Sport`);
    if (process.env.STORE_EMAIL) {
      await send(process.env.STORE_EMAIL, `🛒 Nouvelle commande de ${name} — ${code}`).catch(() => {});
    }
    return json({ sent: r.ok });
  } catch (e) {
    console.error('send-receipt:', e);
    return json({ sent: false });
  }
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}
