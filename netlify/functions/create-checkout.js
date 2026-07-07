/* ============================================================
   CASAL SPORT — Création d'un lien de paiement SumUp
   au MONTANT EXACT (le client ne peut pas le modifier).

   API officielle : POST https://api.sumup.com/v0.1/checkouts
   Docs : https://developer.sumup.com/api/checkouts/create

   ── ACTIVATION (5 minutes, une seule fois) ──────────────────
   1. https://me.sumup.com → Paramètres → "Pour les développeurs"
      (ou developer.sumup.com) → Créer une CLÉ API (secret key,
      commence par "sup_sk_..."). Scope paiements/checkouts.
   2. Récupérer le MERCHANT CODE (Profil → identifiant marchand,
      format "M...", ex: MABC123).
   3. Dans Netlify : Site configuration → Environment variables :
        SUMUP_API_KEY       = sup_sk_xxxxxxxxxxxxx
        SUMUP_MERCHANT_CODE = MXXXXXX
   4. Redéployer (Deploys → Trigger deploy).
   Tant que ces variables n'existent pas, la fonction répond 501
   et le site bascule automatiquement sur l'envoi manuel du lien.
   ============================================================ */

exports.handler = async function (event) {
  // CORS restreint : uniquement le site lui-même (même origine) et
  // les préviews locales — plus de wildcard « * » qui permettrait à
  // n'importe quel site de créer des paiements à notre nom.
  const reqOrigin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const siteUrl = process.env.URL || '';
  const allowed = [siteUrl, 'http://localhost:3338', 'http://localhost:8888'].filter(Boolean);
  const corsOrigin = allowed.includes(reqOrigin) ? reqOrigin : siteUrl || 'null';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const API_KEY  = process.env.SUMUP_API_KEY;
  const MERCHANT = process.env.SUMUP_MERCHANT_CODE;
  if (!API_KEY || !MERCHANT) {
    // Pas encore configuré → le front bascule sur l'envoi manuel
    return { statusCode: 501, headers, body: JSON.stringify({ error: 'SumUp API non configurée' }) };
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) }; }

  const amount = Math.round(parseFloat(payload.amount) * 100) / 100;
  if (!amount || amount <= 0 || amount > 5000) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Montant invalide' }) };
  }
  const reference   = String(payload.reference || 'CS-' + Date.now()).slice(0, 90);
  const description = String(payload.description || 'Commande CASAL SPORT').slice(0, 250);

  try {
    const res = await fetch('https://api.sumup.com/v0.1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        checkout_reference: reference,
        amount,
        currency: 'EUR',
        merchant_code: MERCHANT,
        description,
        // Page de paiement hébergée par SumUp, montant verrouillé
        hosted_checkout: { enabled: true }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('SumUp API error', res.status, JSON.stringify(data));
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'SumUp a refusé la création', detail: data.message || data.error_message || res.status }) };
    }

    const url = data.hosted_checkout_url
             || (data.hosted_checkout && data.hosted_checkout.url)
             || null;

    if (!url) {
      console.error('SumUp: pas de hosted_checkout_url dans la réponse', JSON.stringify(data));
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Lien non retourné par SumUp' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url, id: data.id, amount, reference })
    };
  } catch (e) {
    console.error('create-checkout exception', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};
